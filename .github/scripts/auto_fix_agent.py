#!/usr/bin/env python3
"""
auto_fix_agent.py — AI-powered auto-fix agent running in GitHub Actions.

Triggered by auto-fix.yml when any CI pipeline fails.
Workflow:
  1. A local reasoning agent classifies risk and chooses a specialist.
  2. A local specialist proposes and applies only allow-listed QA changes.
  3. A second local reviewer inspects the diff and targeted rerun.
  4. The agent opens a PR only after the targeted failing tests pass.
  5. OpenAI and Anthropic independently review the same PR evidence.
  6. Two approvals allow merge; any rejection/error goes to Human Review.
  7. The originally failing tests run once more after merge.

The workflow fails closed. Security, auth, production, data, dependency,
workflow, and infrastructure changes are never auto-merged.
"""
from __future__ import annotations

import json
import io
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

# Local import — llm_client.py sits next to this file in .github/scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent))
import llm_client  # noqa: E402

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
REPO      = os.environ.get("REPO", "")
RUN_ID    = os.environ.get("FAILED_RUN_ID", "")
RUN_URL   = os.environ.get("FAILED_RUN_URL", "")
PIPELINE  = os.environ.get("PIPELINE", "CI")
HEAD_SHA  = os.environ.get("HEAD_SHA", "")
HEAD_BRANCH = os.environ.get("HEAD_BRANCH", "")
GH_TOKEN  = os.environ.get("GITHUB_TOKEN", "")
AUTO_MERGE = os.environ.get("AUTO_MERGE", "true").lower() == "true"
REVIEWER_SMOKE = os.environ.get("REVIEWER_SMOKE", "false").lower() == "true"

# Slack notification — uses the bot token via chat.postMessage (no webhook).
# PR-review pings go to the dedicated #ci-pr-review channel
# (PR_REVIEW_CHANNEL_ID); fall back to the bug-reports channel if it isn't set
# so we never silently lose a notification.
SLACK_TOKEN   = os.environ.get("SLACK_BOT_TOKEN", "")
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_CHANNEL = (os.environ.get("PR_REVIEW_CHANNEL_ID", "")
                 or os.environ.get("BUG_REPORTS_CHANNEL_ID", ""))

# Detailed Investigation / Fix / Resolution reports go to #qa-agent-reports.
# Fall back to the PR-review/bug channel so a report is never silently lost.
AGENT_REPORTS_CHANNEL = (os.environ.get("AGENT_REPORTS_CHANNEL_ID", "")
                         or SLACK_CHANNEL)
HUMAN_REVIEW_CHANNEL = (os.environ.get("HUMAN_REVIEW_CHANNEL_ID", "")
                        or AGENT_REPORTS_CHANNEL)

# Pipelines where we must NOT auto-patch code. RAG / eval-quality failures have
# their root cause in the RAG app, the knowledge base, or the eval dataset —
# none of which the agent is allowed to edit. For these we investigate, post a
# detailed report, and open a tracking issue instead of a PR.
REPORT_ONLY_KEYWORDS = (
    "ragas", "rag eval", "eval nightly", "giskard", "observability",
    "langfuse", "langwatch",
)

MAX_LOG_CHARS  = 18000
MAX_FILE_CHARS = 12000
MAX_DIFF_CHARS = 24000

SAFE_AUTOFIX_PREFIXES = (
    "tests/", "e2e/", "pages/", "fixtures/", "helpers/", "scripts/",
    "performance/", ".github/scripts/",
)
SAFE_AUTOFIX_SUFFIXES = (".ts", ".js", ".mjs", ".cjs", ".py")
DENIED_PATH_PARTS = (
    "security", "auth", "secret", "credential", "token", "password",
)


def is_report_only(pipeline: str) -> bool:
    """True for RAG/eval pipelines that should be investigated + reported but
    never auto-patched."""
    p = pipeline.lower()
    return any(k in p for k in REPORT_ONLY_KEYWORDS)


def is_safe_autofix_path(path: str) -> bool:
    """Return True only for low-risk QA-owned source files."""
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    lowered = normalized.lower()
    return (
        normalized.startswith(SAFE_AUTOFIX_PREFIXES)
        and normalized.endswith(SAFE_AUTOFIX_SUFFIXES)
        and not any(part in lowered for part in DENIED_PATH_PARTS)
        and "../" not in normalized
    )


def parse_json_object(content: str) -> dict:
    cleaned = re.sub(r"^```[a-z]*\n?", "", (content or "").strip()).rstrip("` \n")
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

def gh_request(path: str, accept: str = "application/vnd.github+json") -> bytes:
    url = f"https://api.github.com/{path.lstrip('/')}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        print(f"  GitHub API {path}: HTTP {e.code}", file=sys.stderr)
        return b""
    except Exception as e:
        print(f"  GitHub API {path}: {e}", file=sys.stderr)
        return b""


def get_workflow_logs() -> str:
    """Download zipped logs from the failed run and return concatenated text."""
    print("  Downloading workflow logs...")
    raw = gh_request(
        f"repos/{REPO}/actions/runs/{RUN_ID}/logs",
        accept="application/vnd.github+json",
    )
    if not raw:
        return ""
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            names = sorted(
                name for name in zf.namelist() if name.endswith(".txt"))[:8]
            parts = []
            for name in names:
                text = zf.read(name).decode(errors="replace")
                parts.append(f"=== {Path(name).name} ===\n{text[-3000:]}")
    except Exception as e:
        print(f"  Log zip read error: {e}", file=sys.stderr)
        return ""

    combined = "\n\n".join(parts)
    return combined[:MAX_LOG_CHARS]


def get_job_logs_via_api() -> str:
    """Fallback: get individual job logs text via GitHub API."""
    data = gh_request(f"repos/{REPO}/actions/runs/{RUN_ID}/jobs")
    if not data:
        return ""
    jobs = json.loads(data).get("jobs", [])
    parts: list[str] = []
    for job in jobs:
        if job.get("conclusion") not in ("failure", "cancelled"):
            continue
        job_id  = job["id"]
        log_raw = gh_request(f"repos/{REPO}/actions/jobs/{job_id}/logs",
                              accept="application/vnd.github+json")
        if log_raw:
            parts.append(f"=== Job: {job['name']} ===\n{log_raw.decode(errors='replace')[-3000:]}")
    return "\n\n".join(parts)[:MAX_LOG_CHARS]


# ---------------------------------------------------------------------------
# Find failing test files
# ---------------------------------------------------------------------------

def find_failing_files(logs: str) -> list[str]:
    """Extract low-risk QA source paths mentioned in failure logs."""
    patterns = [
        r"(tests?/[\w/.-]+\.spec\.ts)",
        r"(tests?/[\w/.-]+\.spec\.js)",
        r"(tests?/[\w/.-]+_test\.py)",
        r"(tests?/[\w/.-]+\.py)",
        r"(e2e/[\w/.-]+\.spec\.ts)",
        r"((?:pages|fixtures|helpers|scripts|performance)/[\w/.-]+\.(?:ts|js|mjs|cjs|py))",
        r"(\.github/scripts/[\w/.-]+\.py)",
        r"FAILED\s+(tests?/[\w/.-]+)",
        r"● ([\w /.-]+?) ›",
    ]
    found: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, logs):
            candidate = m.group(1).strip()
            if Path(candidate).is_file() and is_safe_autofix_path(candidate):
                found.add(candidate)
    result = sorted(found)[:8]
    # If nothing is named explicitly, provide a small test-only context set.
    if not result:
        for glob in ["tests/**/*.spec.ts", "tests/**/*.py", "e2e/**/*.spec.ts"]:
            result += [
                str(p) for p in Path(".").glob(glob)
                if is_safe_autofix_path(str(p))
            ][:3]
    return result[:8]


def read_files(paths: list[str]) -> str:
    parts: list[str] = []
    total = 0
    for p in paths:
        try:
            text = Path(p).read_text(errors="replace")
            chunk = f"### {p}\n```\n{text[:4000]}\n```"
            parts.append(chunk)
            total += len(chunk)
            if total > MAX_FILE_CHARS:
                break
        except Exception:
            pass
    return "\n\n".join(parts)


def gather_eval_context() -> str:
    """For RAG/eval pipelines: collect the human-readable report + machine
    summary so the LLM can investigate which questions failed and why. Reads
    both the in-repo eval/results/ and any artifact dirs the workflow extracted
    from the failed run."""
    patterns = [
        "eval/results/report.md",
        "eval/results/summary.json",
        "eval/results/giskard_rag.json",
        "eval/results/giskard_scan.json",
        "**/report.md",
        "**/summary.json",
        "**/giskard_rag.json",
        "**/giskard_scan.json",
    ]
    seen: set[str] = set()
    parts: list[str] = []
    total = 0
    for pat in patterns:
        for p in sorted(Path(".").glob(pat)):
            sp = str(p)
            if sp in seen or not p.is_file():
                continue
            seen.add(sp)
            try:
                text = p.read_text(errors="replace")
            except Exception:
                continue
            chunk = f"### {sp}\n{text[:4000]}"
            parts.append(chunk)
            total += len(chunk)
            if total > MAX_FILE_CHARS:
                return "\n\n".join(parts)
    return "\n\n".join(parts)


TRIAGE_SYSTEM_PROMPT = """You are the triage agent for an automated CI repair system.
Decide whether a failure can be repaired automatically with a small, low-risk
change in QA-owned code. Fail closed.

Return ONLY JSON with:
- decision: "auto_fix" or "human_review"
- specialist: "test_healer", "performance_engineer", or "automation_engineer"
- category: one of "test_maintenance", "test_flake", "qa_script",
  "performance_test", "product", "security", "auth", "data_eval",
  "dependency", "workflow", "infrastructure", "unknown"
- confidence: number from 0 to 1
- evidence: concise evidence from the logs
- reason: concise decision rationale

Auto-fix is allowed only for test_maintenance, test_flake, qa_script, and
performance_test. Security/auth, product behavior, eval data or thresholds,
dependencies, GitHub workflows, credentials, and infrastructure always require
human review. Unclear evidence always requires human review."""


def triage_failure(logs: str, files: str) -> dict:
    """Use the local reasoning model to classify failure and enforce safety."""
    if HEAD_BRANCH and HEAD_BRANCH not in ("master", "main"):
        return {
            "decision": "human_review", "specialist": "automation_engineer",
            "category": "unknown", "confidence": 1.0,
            "evidence": f"Failure came from non-default branch {HEAD_BRANCH}.",
            "reason": "Automatic changes are limited to default-branch failures.",
        }
    if is_report_only(PIPELINE):
        return {
            "decision": "human_review", "specialist": "automation_engineer",
            "category": "data_eval", "confidence": 1.0,
            "evidence": f"{PIPELINE} is an evaluation/observability pipeline.",
            "reason": "Quality, telemetry, and dataset changes need owner review.",
        }

    prompt = f"""Pipeline: {PIPELINE}
Failed run: {RUN_URL}

Failure logs:
{logs[:MAX_LOG_CHARS]}

Candidate QA files:
{files[:MAX_FILE_CHARS]}
"""
    result = llm_client.chat(
        messages=[{"role": "user", "content": prompt}],
        system=TRIAGE_SYSTEM_PROMPT,
        max_tokens=1536,
        temperature=0.0,
        timeout=180,
    )
    triage = parse_json_object(result.get("content") or "")
    safe_categories = {
        "test_maintenance", "test_flake", "qa_script", "performance_test",
    }
    try:
        confidence = float(triage.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    if (
        triage.get("decision") != "auto_fix"
        or triage.get("category") not in safe_categories
        or confidence < 0.8
    ):
        triage["decision"] = "human_review"
    triage.setdefault("specialist", "automation_engineer")
    triage.setdefault("category", "unknown")
    triage.setdefault("confidence", confidence)
    triage.setdefault("evidence", "Local triage returned no concrete evidence.")
    triage.setdefault("reason", "Safety gate requires human review.")
    triage["provider"] = result.get("provider") or "none"
    return triage


# ---------------------------------------------------------------------------
# LLM calls
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "edit_file",
        "description": (
            "Apply a targeted fix to an allow-listed QA source file. "
            "Only call this when you are confident the fix is correct."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Relative path to the file (e.g. tests/foo.spec.ts)"
                },
                "old_text": {
                    "type": "string",
                    "description": "Exact text to be replaced (must exist verbatim in the file)"
                },
                "new_text": {
                    "type": "string",
                    "description": "Replacement text"
                },
                "reason": {
                    "type": "string",
                    "description": "One sentence: why this change fixes the failure"
                },
            },
            "required": ["file_path", "old_text", "new_text", "reason"],
        },
    },
    {
        "name": "give_up",
        "description": "Cannot determine a safe, confident fix. Use this instead of guessing.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "Why no fix was possible"}
            },
            "required": ["reason"],
        },
    },
]

SYSTEM_PROMPT = """You are the specialist repair agent for failed CI checks.

Rules:
- Only edit QA-owned files under tests/, e2e/, pages/, fixtures/, helpers/,
  scripts/, performance/, or .github/scripts/.
- Never edit application code, security/auth tests, workflows, dependencies,
  lockfiles, secrets, credentials, eval datasets, or quality thresholds.
- Make the minimal change needed to fix the failure.
- Fix root causes: broken selectors, timing issues, changed API responses, wrong assertions.
- Do NOT add arbitrary waitForTimeout() calls or sleep() — fix the underlying cause.
- Use POM selectors where they exist; do not add raw page.locator() in spec bodies.
- If you are not confident in a fix, call give_up instead of guessing.
- Call edit_file once per logical change. You may call it multiple times for multiple files."""


def build_prompt(logs: str, files: str, triage: dict) -> str:
    return f"""Pipeline: {PIPELINE}
Failed run: {RUN_URL}
Specialist role: {triage.get('specialist', 'automation_engineer')}
Triage category: {triage.get('category', 'unknown')}
Triage evidence: {triage.get('evidence', '')}

## CI failure logs (truncated to last ~3000 chars per job):
{logs}

## Test file contents:
{files}

Analyze the failure. If you can determine a confident, minimal fix, call edit_file.
If the failure requires application changes or you cannot determine the root cause safely, call give_up."""


def call_llm(logs: str, files: str, triage: dict) -> tuple[list[dict], str]:
    """Call the rotating LLM client with native tool-use support.

    Returns (tool_calls, provider_used). tool_calls items follow the existing
    {"name": str, "input": dict} shape used by apply_fixes().

    If the provider returned tool_calls natively, use them as-is. If it only
    returned text content (some weaker models do this even with tools=...),
    fall back to JSON-parsing a fenced array — same trick the old call_groq
    used. Either way, downstream code is unchanged.
    """
    providers = llm_client.configured_providers()
    if not providers:
        print("  No LLM providers configured (no API keys in env).",
              file=sys.stderr)
        return [], ""
    print(f"  Available providers: {', '.join(providers)}")

    result = llm_client.chat(
        messages=[{"role": "user", "content": build_prompt(logs, files, triage)}],
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        max_tokens=4096,
        temperature=0.1,
        timeout=90,
    )

    provider = result.get("provider", "")
    tool_calls = result.get("tool_calls", [])
    content = result.get("content", "")

    if tool_calls:
        print(f"  ✅ {provider} returned {len(tool_calls)} tool call(s)")
        return tool_calls, provider

    # Fallback: parse a JSON array out of the content (some models don't
    # honor tool_choice and just write the JSON instead).
    if content.strip():
        cleaned = re.sub(r"^```[a-z]*\n?", "", content.strip()).rstrip("` \n")
        try:
            fixes = json.loads(cleaned)
            if isinstance(fixes, list) and fixes:
                print(f"  ✅ {provider} returned {len(fixes)} fixes via "
                      f"text-JSON fallback")
                return [{"name": "edit_file", "input": f} for f in fixes], provider
        except json.JSONDecodeError:
            pass

    print(f"  All providers failed or returned no fix. Errors:")
    for e in result.get("errors", []):
        print(f"    {e}", file=sys.stderr)
    return [], ""


REPORT_SYSTEM_PROMPT = """You are a senior QA / LLM-evaluation engineer triaging a failed CI run.
Write a concise incident report grounded in concrete evidence from the logs
(test names, metrics, thresholds, error messages). Never invent details — if
the logs are inconclusive, say so.

Return ONLY a JSON object (no markdown fence, no prose around it) with keys:
- "investigation": 2-4 sentences. What failed and the most likely root cause,
  citing specific evidence.
- "fix": 2-4 sentences. For test-code failures, the concrete code change that
  resolves it. For RAG / eval-quality failures, the concrete fix you recommend
  (which dataset/threshold/file or which RAG-app behaviour) — note that test
  code cannot fix a genuine answer-quality regression.
- "severity": one of "low", "medium", "high"."""


def investigate(logs: str, context: str) -> dict:
    """Ask the LLM for a structured Investigation/Fix narrative. Returns a dict
    with keys investigation, fix, severity. Never raises — returns {} on fail."""
    prompt = f"""Pipeline: {PIPELINE}
Failed run: {RUN_URL}

## CI failure logs (truncated):
{logs}

## Additional context (test files / eval reports):
{context}

Produce the JSON incident report described in the system prompt."""
    try:
        result = llm_client.chat(
            messages=[{"role": "user", "content": prompt}],
            system=REPORT_SYSTEM_PROMPT,
            max_tokens=1024,
            temperature=0.2,
            timeout=90,
        )
    except Exception as e:
        print(f"  ⚠ investigate() LLM error: {e}", file=sys.stderr)
        return {}
    content = (result.get("content") or "").strip()
    if not content:
        return {}
    cleaned = re.sub(r"^```[a-z]*\n?", "", content).rstrip("` \n")
    # Some models wrap the JSON in prose — grab the first {...} block.
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(0)
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        print("  ⚠ investigate() returned non-JSON; using raw text",
              file=sys.stderr)
        return {"investigation": content[:600], "fix": "", "severity": "medium"}
    return {}


# ---------------------------------------------------------------------------
# Apply fixes
# ---------------------------------------------------------------------------

def apply_fixes(tool_uses: list[dict]) -> list[dict]:
    applied: list[dict] = []
    for tool in tool_uses:
        name = tool.get("name")
        inp  = tool.get("input", {})

        if name == "give_up":
            print(f"  Agent gave up: {inp.get('reason', '—')}")
            continue

        if name != "edit_file":
            continue

        path     = Path(inp.get("file_path", ""))
        old_text = inp.get("old_text", "")
        new_text = inp.get("new_text", "")
        reason   = inp.get("reason", "")

        if not is_safe_autofix_path(str(path)):
            print(f"  ⚠ Unsafe path rejected: {path}", file=sys.stderr)
            continue
        if not path.exists():
            print(f"  ⚠ File not found: {path}", file=sys.stderr)
            continue

        content = path.read_text(errors="replace")
        if old_text not in content:
            print(f"  ⚠ old_text not found in {path} — skipping", file=sys.stderr)
            continue

        path.write_text(content.replace(old_text, new_text, 1))
        print(f"  ✅ {path}: {reason}")
        applied.append(inp)

    return applied


# ---------------------------------------------------------------------------
# Deterministic targeted verification + independent reviews
# ---------------------------------------------------------------------------

def run_process(command: list[str], timeout: int = 900) -> dict:
    print(f"  $ {' '.join(command)}")
    started = time.monotonic()
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=timeout,
            env=os.environ.copy(),
        )
        output = (result.stdout + "\n" + result.stderr).strip()
        return {
            "command": command, "passed": result.returncode == 0,
            "returncode": result.returncode, "duration_seconds": round(
                time.monotonic() - started, 1),
            "output": output[-12000:],
        }
    except subprocess.TimeoutExpired as exc:
        output = ((exc.stdout or "") + "\n" + (exc.stderr or ""))[-12000:]
        return {
            "command": command, "passed": False, "returncode": 124,
            "duration_seconds": round(time.monotonic() - started, 1),
            "output": f"Timed out after {timeout}s\n{output}",
        }


def targeted_commands(failing_files: list[str], logs: str) -> list[list[str]]:
    """Map known pipelines to fixed commands; never execute LLM-authored shell."""
    pipeline = PIPELINE.lower()
    specs = [
        path for path in failing_files
        if path.endswith((".spec.ts", ".spec.js"))
    ]
    python_files = [path for path in failing_files if path.endswith(".py")]
    python_tests = [
        path for path in python_files
        if path.startswith("tests/") and Path(path).name.startswith("test_")
    ]

    if "design" in pipeline:
        return [["npx", "playwright", "test", "design-regression", "--project=chromium"]]
    if "llm quality" in pipeline:
        command = ["npx", "playwright", "test"] + specs
        command += ["--grep", "LLM Judge|Content quality", "--workers=1"]
        return [command]
    if "playwright" in pipeline:
        if specs:
            return [["npx", "playwright", "test", *specs, "--workers=1"]]
        if python_tests:
            return [[
                sys.executable, "-m", "pytest", *python_tests, "--tb=short",
            ]]
        return []
    if "promptfoo" in pipeline:
        return [[
            "npx", "promptfoo", "eval", "-c", "promptfooconfig.yaml",
            "--max-concurrency", "1", "--no-progress-bar", "--no-cache",
        ]]
    if "k6" in pipeline or "performance" in pipeline:
        scenarios = [
            name for name in (
                "smoke", "rps-50", "rps-100", "vus-50", "vus-100",
                "load", "stress", "spike", "chatbot-minimal",
            )
            if name in logs.lower()
        ]
        if len(scenarios) != 1:
            return []
        return [[
            "k6", "run", "-e", f"PERFORMANCE_SCENARIO={scenarios[0]}",
            "performance/site.js",
        ]]
    if python_files:
        return [[sys.executable, "-m", "py_compile", *python_files]]
    return []


def run_targeted_tests(failing_files: list[str], logs: str) -> dict:
    commands = targeted_commands(failing_files, logs)
    if not commands:
        return {
            "passed": False, "results": [],
            "reason": "No deterministic targeted rerun could be derived.",
        }

    if any(command[0] == "npx" for command in commands):
        install_command = ["npm", "ci", "--no-audit", "--no-fund"]
        if not any("promptfoo" in command for command in commands):
            install_command.append("--ignore-scripts")
        install = run_process(install_command, 900)
        if not install["passed"]:
            return {
                "passed": False, "results": [install],
                "reason": "Dependency installation failed.",
            }
    if any("playwright" in command for command in commands):
        browser = run_process(["npx", "playwright", "install", "chromium"], 600)
        if not browser["passed"]:
            return {
                "passed": False, "results": [browser],
                "reason": "Playwright browser installation failed.",
            }

    results = [run_process(command) for command in commands]
    return {
        "passed": all(result["passed"] for result in results),
        "results": results,
        "reason": "All targeted checks passed." if all(
            result["passed"] for result in results) else "A targeted check failed.",
    }


LOCAL_REVIEW_SYSTEM = """You are an independent senior code-review agent.
Review only the supplied diff and targeted test evidence. Return ONLY JSON:
{"verdict":"APPROVE|REJECT","confidence":0.0,"reason":"...","risks":["..."]}.
Reject unsafe scope, weakened assertions, hidden sleeps, reduced coverage,
changes unrelated to the failure, or insufficient verification."""


def local_review(diff: str, test_result: dict, triage: dict) -> dict:
    result = llm_client.chat(
        messages=[{"role": "user", "content": f"""Pipeline: {PIPELINE}
Triage: {json.dumps(triage)}
Diff:\n{diff[:MAX_DIFF_CHARS]}
Targeted test evidence:\n{json.dumps(test_result)[:12000]}
"""}],
        system=LOCAL_REVIEW_SYSTEM,
        max_tokens=1536,
        temperature=0.0,
        timeout=180,
    )
    review = parse_json_object(result.get("content") or "")
    review["provider"] = result.get("provider") or "none"
    try:
        confidence = float(review.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    review["approved"] = (
        review.get("verdict") == "APPROVE"
        and confidence >= 0.8
        and test_result.get("passed") is True
    )
    return review


CLOUD_REVIEW_SYSTEM = """You are a final merge safety reviewer. Independently
review the CI failure, proposed diff, local review, and targeted rerun. Return
ONLY JSON: {"verdict":"APPROVE|REJECT","confidence":0.0,"reason":"...",
"risks":["..."]}. Approve only when the patch is minimal, addresses the
evidenced root cause, preserves coverage and security, and is safe to merge.
If evidence is missing or ambiguous, reject."""


def cloud_review(
    provider: str, model: str, diff: str, test_result: dict, local: dict,
    logs: str,
) -> dict:
    prompt = f"""Pipeline: {PIPELINE}
Failed run: {RUN_URL}
Failure evidence:\n{logs[-6000:]}
Diff:\n{diff[:MAX_DIFF_CHARS]}
Local review:\n{json.dumps(local)[:4000]}
Targeted rerun:\n{json.dumps(test_result)[:10000]}
"""
    result = llm_client.chat_provider(
        provider,
        [{"role": "user", "content": prompt}],
        system=CLOUD_REVIEW_SYSTEM,
        model=model,
        max_tokens=3000 if provider == "openai" else 5000,
        temperature=0.0,
        timeout=180,
        reasoning_effort="medium" if provider == "openai" else "high",
        json_response=True,
    )
    review = parse_json_object(result.get("content") or "")
    review.update({
        "provider": provider,
        "model": result.get("model") or model,
        "usage": result.get("usage") or {},
        "errors": result.get("errors") or [],
    })
    try:
        confidence = float(review.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    review["approved"] = (
        not review["errors"]
        and review.get("verdict") == "APPROVE"
        and confidence >= 0.8
    )
    return review


# ---------------------------------------------------------------------------
# Git + GitHub PR
# ---------------------------------------------------------------------------

def git(*args: str) -> str:
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    if result.returncode != 0 and args[0] not in ("diff",):
        print(f"  git {' '.join(args)}: {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip()


def slack_post(channel: str, text: str, label: str = "Slack") -> bool:
    """Best-effort Slack post through a bot or repository webhook."""
    if SLACK_TOKEN and channel:
        payload = json.dumps({"channel": channel, "text": text}).encode()
        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=payload,
            headers={
                "Authorization": f"Bearer {SLACK_TOKEN}",
                "Content-Type": "application/json; charset=utf-8",
            },
        )
    elif SLACK_WEBHOOK:
        payload = json.dumps({"text": text}).encode()
        req = urllib.request.Request(
            SLACK_WEBHOOK,
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
    else:
        print(f"  ({label} skipped — no Slack bot destination or webhook)")
        return False
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode(errors="replace")
        if SLACK_TOKEN and channel:
            resp = json.loads(raw)
            ok = resp.get("ok") is True
            error = resp.get("error")
        else:
            ok = raw.strip().lower() == "ok"
            error = raw[:200]
        if ok:
            print(f"  💬 {label} sent")
            return True
        print(f"  ⚠ {label} error: {error}", file=sys.stderr)
    except Exception as e:
        print(f"  ⚠ {label} failed: {e}", file=sys.stderr)
    return False


def slack_notify(pr_url: str, fixes: list[dict]) -> None:
    """Short Slack ping when a locally reviewed candidate PR is opened."""
    changed = ", ".join(sorted({f["file_path"] for f in fixes})) or "test files"
    text = (f":robot_face: *Auto-fix candidate PR* — {PIPELINE}\n"
            f"Files: {changed}\n"
            f"Waiting for independent OpenAI + Anthropic approval before merge.\n"
            f"{pr_url}")
    slack_post(SLACK_CHANNEL, text, label="Slack PR notify")


_SEVERITY_EMOJI = {"high": ":rotating_light:", "medium": ":warning:",
                   "low": ":information_source:"}


def post_agent_report(report: dict, resolution: str) -> None:
    """Post the detailed Investigation / Fix / Resolution report to
    #qa-agent-reports. `report` comes from investigate(); `resolution` is set
    by the caller based on what actually happened (PR opened, issue opened, or
    no safe fix). Best-effort — never raises."""
    severity = (report.get("severity") or "medium").lower()
    emoji = _SEVERITY_EMOJI.get(severity, ":warning:")
    investigation = report.get("investigation") or "_(no analysis produced)_"
    fix = report.get("fix") or "_(no fix proposed)_"
    text = (
        f"{emoji} *Agent incident report — {PIPELINE}*  _(severity: {severity})_\n"
        f"*Failed run:* {RUN_URL}\n\n"
        f"*:mag: Investigation*\n{investigation}\n\n"
        f"*:wrench: Fix*\n{fix}\n\n"
        f"*:white_check_mark: Resolution*\n{resolution}"
    )
    slack_post(AGENT_REPORTS_CHANNEL, text, label="Agent report")


def post_human_review(stage: str, reason: str, evidence: dict | None = None) -> None:
    details = json.dumps(evidence or {}, indent=2)[:2400]
    text = (
        f":octagonal_sign: *Human review required — {PIPELINE}*\n"
        f"*Stage:* {stage}\n"
        f"*Failed run:* {RUN_URL}\n"
        f"*Reason:* {reason}\n"
        f"*Evidence:*\n```{details}```"
    )
    slack_post(HUMAN_REVIEW_CHANNEL, text, label="Human Review")


def post_agent_stage(stage: str, status: str, detail: str) -> None:
    emoji = ":white_check_mark:" if status == "passed" else ":information_source:"
    slack_post(
        AGENT_REPORTS_CHANNEL,
        f"{emoji} *Agent Fix — {stage}*\n*Pipeline:* {PIPELINE}\n{detail}",
        label=f"Agent stage {stage}",
    )


def write_agent_artifact(payload: dict) -> None:
    Path("agent-fix-report.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=True) + "\n")


def open_tracking_issue(report: dict) -> str:
    """Open a GitHub issue capturing the investigation + recommended fix for a
    failure the agent must not auto-patch (RAG/eval) or couldn't fix safely.
    Returns the issue URL, or "" on failure. Best-effort."""
    severity = (report.get("severity") or "medium").lower()
    investigation = report.get("investigation") or "(no analysis produced)"
    fix = report.get("fix") or "(no fix proposed)"
    title = f"[auto-triage] {PIPELINE} failure — needs human review"
    body = f"""## 🤖 Agent triage report

**Failed CI run:** {RUN_URL}
**Head commit:** `{HEAD_SHA}`
**Severity:** {severity}

### 🔍 Investigation
{investigation}

### 🔧 Recommended fix
{fix}

---
*Opened automatically by the auto-fix agent. This failure was not auto-patched
(RAG/eval-quality root causes live in the app, knowledge base, or dataset, which
the agent must not edit, or no confident test-code fix was found). A human should
review and decide on the fix.*
"""
    create = subprocess.run(
        ["gh", "issue", "create", "--title", title, "--body", body],
        capture_output=True, text=True,
    )
    if create.returncode != 0:
        print(f"  ⚠ issue creation failed: {create.stderr.strip()}",
              file=sys.stderr)
        return ""
    issue_url = create.stdout.strip()
    print(f"  ✅ tracking issue created: {issue_url}")
    # Best-effort label — a missing label must never fail the run.
    lbl = subprocess.run(
        ["gh", "issue", "edit", issue_url, "--add-label", "bug"],
        capture_output=True, text=True,
    )
    if lbl.returncode != 0:
        print(f"  (issue label not applied: {lbl.stderr.strip()})",
              file=sys.stderr)
    return issue_url


def create_pr(fixes: list[dict]) -> tuple[str, str]:
    """Push only allow-listed edits and open a PR."""
    slug      = re.sub(r"[^a-z0-9]+", "-", PIPELINE.lower())[:25].strip("-")
    short_sha = (HEAD_SHA or "unknown")[:8]
    attempt = os.environ.get("GITHUB_RUN_ATTEMPT", "1")
    branch = f"codex/agent-fix-{slug}-{RUN_ID or short_sha}-{attempt}"
    base_branch = os.environ.get("DEFAULT_BRANCH", "master")

    checkout = subprocess.run(
        ["git", "checkout", "-b", branch], capture_output=True, text=True)
    if checkout.returncode != 0:
        print(f"  branch creation failed: {checkout.stderr.strip()}", file=sys.stderr)
        return "", branch

    files_changed = sorted({
        f["file_path"] for f in fixes if is_safe_autofix_path(f["file_path"])
    })
    if not files_changed:
        return "", branch
    add = subprocess.run(
        ["git", "add", "--", *files_changed], capture_output=True, text=True)
    if add.returncode != 0:
        print(f"  git add failed: {add.stderr.strip()}", file=sys.stderr)
        return "", branch

    fix_lines = "\n".join(f"- {f['file_path']}: {f['reason']}" for f in fixes)
    commit_msg = (
        f"fix(tests): auto-fix {PIPELINE} failures\n\n"
        f"Failing CI run: {RUN_URL}\n"
        f"Files changed: {', '.join(files_changed)}"
    )
    commit = subprocess.run(
        ["git", "commit", "-m", commit_msg], capture_output=True, text=True)
    if commit.returncode != 0:
        print(f"  git commit failed: {commit.stderr.strip()}", file=sys.stderr)
        return "", branch
    push = subprocess.run(
        ["git", "push", "origin", branch], capture_output=True, text=True)
    if push.returncode != 0:
        print(f"  git push failed: {push.stderr.strip()}", file=sys.stderr)
        return "", branch

    # PR body
    pr_body = f"""## 🤖 Auto-fix: {PIPELINE}

**Failing CI run:** {RUN_URL}
**Head commit:** `{HEAD_SHA}`

### Changes applied
{fix_lines}

### Review checklist
- [ ] Tests pass locally (`npx playwright test` or `pytest`)
- [ ] No new `waitForTimeout` / `sleep` calls added
- [ ] Change is minimal and targeted to the failure

---
*This PR was created automatically by the auto-fix agent. Review carefully before merging.*
"""

    # Create the PR with only the flags that can't fail. A bad --reviewer or a
    # non-existent --label makes `gh pr create` exit non-zero AFTER pushing the
    # branch, which orphans it with no PR. Metadata is applied best-effort below.
    create = subprocess.run(
        [
            "gh", "pr", "create",
            "--title", f"fix: auto-fix {PIPELINE} ({short_sha})",
            "--body", pr_body,
            "--head", branch,
            "--base", base_branch,
        ],
        capture_output=True,
        text=True,
    )
    if create.returncode != 0:
        print(f"  ⚠ PR creation failed: {create.stderr.strip()}", file=sys.stderr)
        return "", branch
    pr_url = create.stdout.strip()
    print(f"  ✅ PR created: {pr_url}")

    # Ping the human in Slack — GitHub won't, since the bot authored the PR.
    slack_notify(pr_url, fixes)

    # Best-effort metadata — a missing label/reviewer must never orphan the PR.
    # Reviewer is opt-in via PR_REVIEWER env (must be a real repo collaborator).
    reviewer = os.environ.get("PR_REVIEWER", "").strip()
    label = subprocess.run(
        ["gh", "pr", "edit", pr_url, "--add-label", "bug"],
        capture_output=True, text=True,
    )
    if label.returncode != 0:
        print(f"  (label not applied: {label.stderr.strip()})", file=sys.stderr)
    if reviewer:
        rev = subprocess.run(
            ["gh", "pr", "edit", pr_url, "--add-reviewer", reviewer],
            capture_output=True, text=True,
        )
        if rev.returncode != 0:
            print(f"  (reviewer not added: {rev.stderr.strip()})", file=sys.stderr)

    return pr_url, branch


def merge_pr(pr_url: str) -> dict:
    """Merge an approved PR without deleting its branch."""
    result = subprocess.run(
        ["gh", "pr", "merge", pr_url, "--squash"],
        capture_output=True,
        text=True,
    )
    return {
        "merged": result.returncode == 0,
        "output": (result.stdout + "\n" + result.stderr).strip()[-4000:],
    }


def checkout_merged_default() -> dict:
    base_branch = os.environ.get("DEFAULT_BRANCH", "master")
    fetch = subprocess.run(
        ["git", "fetch", "origin", base_branch], capture_output=True, text=True)
    if fetch.returncode != 0:
        return {"passed": False, "output": fetch.stderr[-4000:]}
    checkout = subprocess.run(
        ["git", "checkout", "--detach", f"origin/{base_branch}"],
        capture_output=True,
        text=True,
    )
    return {
        "passed": checkout.returncode == 0,
        "output": (checkout.stdout + "\n" + checkout.stderr).strip()[-4000:],
    }


def run_reviewer_smoke() -> bool:
    """Make one small real call to each merge-gate model without a PR."""
    failed_fixture = run_process([
        sys.executable, "-c",
        "values=[1,2]; actual=sum(values)+1; "
        "assert actual == 3, f'expected 3, received {actual}'",
    ])
    targeted_fixture = run_process([
        sys.executable, "-c",
        "values=[1,2]; actual=sum(values); "
        "assert actual == 3, f'expected 3, received {actual}'",
    ])
    logs = (
        "Reviewer smoke regression fixture reproduced the off-by-one failure.\n"
        f"Pre-patch return code: {failed_fixture['returncode']}\n"
        f"Pre-patch output:\n{failed_fixture['output']}"
    )
    diff = """diff --git a/tests/helpers/math.py b/tests/helpers/math.py
--- a/tests/helpers/math.py
+++ b/tests/helpers/math.py
@@
 def sum_numbers(values):
-    return sum(values) + 1
+    return sum(values)
"""
    targeted = {
        "passed": targeted_fixture["passed"],
        "reason": (
            "The complete one-test regression fixture passed after the patch."
        ),
        "results": [targeted_fixture],
    }
    triage = {
        "decision": "auto_fix", "specialist": "test_healer",
        "category": "qa_script", "confidence": 1.0,
        "evidence": (
            "The executable pre-patch fixture failed with expected 3, received "
            "4; the same complete fixture passed after removing + 1."
        ),
    }
    local = local_review(diff, targeted, triage)
    smart_model = os.environ.get("FINAL_SMART_MODEL", "gpt-5.5")
    second_model = os.environ.get("FINAL_SECOND_MODEL", "claude-sonnet-5")
    smart = cloud_review(
        "openai", smart_model, diff, targeted, local, logs)
    second = cloud_review(
        "anthropic", second_model, diff, targeted, local, logs)
    approved = all(
        review.get("approved") for review in (local, smart, second))
    state = {
        "status": "passed" if approved else "human_review",
        "mode": "reviewer_smoke",
        "local_review": local,
        "cloud_reviews": [smart, second],
    }
    write_agent_artifact(state)
    if approved:
        post_agent_stage(
            "reviewer smoke", "passed",
            f"Local model, OpenAI `{smart_model}`, and Anthropic "
            f"`{second_model}` all returned APPROVE. No PR was created.",
        )
        return True
    post_human_review(
        "reviewer smoke", "At least one real reviewer call did not approve.",
        state,
    )
    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"\n{'='*55}")
    print(f"Auto-fix Agent: {PIPELINE}")
    print(f"{'='*55}")

    if not GH_TOKEN:
        print("No GITHUB_TOKEN — aborting", file=sys.stderr)
        sys.exit(1)

    if "ollama" not in llm_client.configured_providers():
        print("Local reasoning model is not configured — failing closed", file=sys.stderr)
        sys.exit(1)

    if REVIEWER_SMOKE:
        print("\n[smoke] Calling all three independent reviewers...")
        if not run_reviewer_smoke():
            sys.exit(1)
        return

    print("\n[1] Fetching failure logs...")
    logs = get_workflow_logs()
    if not logs:
        print("  Zip download failed — trying per-job API...")
        logs = get_job_logs_via_api()
    if not logs:
        # Try to read from downloaded artifact
        for p in Path(".").rglob("*.json"):
            try:
                data = p.read_text(errors="replace")
                if any(k in data for k in ("unexpected", "FAILED", "error")):
                    logs += data[:3000]
            except Exception:
                pass

    if not logs:
        reason = "No failed-run logs were available for evidence-based triage."
        post_human_review("log collection", reason)
        write_agent_artifact({"status": "human_review", "reason": reason})
        return

    print(f"  Got {len(logs)} chars of logs")

    state: dict = {
        "pipeline": PIPELINE, "failed_run": RUN_URL, "failed_run_id": RUN_ID,
        "head_sha": HEAD_SHA, "head_branch": HEAD_BRANCH,
    }

    print("\n[2] Identifying relevant QA files...")
    failing = find_failing_files(logs)
    print(f"  Found: {failing or '(none — will scan all tests)'}")
    file_content = read_files(failing)

    print("\n[3] Local reasoning-model triage...")
    triage = triage_failure(logs, file_content)
    state["triage"] = triage
    post_agent_stage(
        "triage",
        "passed" if triage.get("decision") == "auto_fix" else "review",
        f"Decision: `{triage.get('decision')}` | Specialist: "
        f"`{triage.get('specialist')}`\n{triage.get('reason')}",
    )
    if triage.get("decision") != "auto_fix":
        context = gather_eval_context() if is_report_only(PIPELINE) else file_content
        report = investigate(logs, context) or {
            "investigation": triage.get("evidence"),
            "fix": triage.get("reason"), "severity": "medium",
        }
        issue_url = open_tracking_issue(report)
        reason = triage.get("reason") or "Local triage requires human review."
        state.update({"status": "human_review", "stage": "triage", "issue": issue_url})
        write_agent_artifact(state)
        post_human_review("triage", reason, triage)
        post_agent_report(report, f"Human review required. Tracking issue: {issue_url or 'not created'}")
        return

    print(f"\n[4] Local {triage.get('specialist')} fix agent...")
    tool_uses, provider = call_llm(logs, file_content, triage)
    print(f"  Fix author: {provider or '(none)'}")

    applied: list[dict] = []
    if tool_uses:
        print("  Applying proposed fixes...")
        applied = apply_fixes(tool_uses)

    changed_files = [p for p in git("diff", "--name-only", "HEAD").splitlines() if p]
    unsafe = [path for path in changed_files if not is_safe_autofix_path(path)]
    if not applied or not changed_files or unsafe:
        reason = (
            f"Fix agent produced unsafe paths: {unsafe}" if unsafe
            else "Fix agent produced no confident, reviewable change."
        )
        report = investigate(logs, file_content) or {
            "investigation": triage.get("evidence"), "fix": reason,
            "severity": "medium",
        }
        issue_url = open_tracking_issue(report)
        state.update({"status": "human_review", "stage": "fix", "reason": reason,
                      "issue": issue_url})
        write_agent_artifact(state)
        post_human_review("fix agent", reason, {"changed_files": changed_files})
        post_agent_report(report, f"Human review required. Tracking issue: {issue_url or 'not created'}")
        return
    state.update({"fix_provider": provider, "changed_files": changed_files})
    post_agent_stage("fix", "passed", f"Changed: `{', '.join(changed_files)}`")

    print("\n[5] Targeted pre-merge rerun...")
    targeted = run_targeted_tests(failing, logs)
    state["pre_merge_tests"] = targeted
    if not targeted.get("passed"):
        reason = targeted.get("reason") or "Targeted tests failed."
        state.update({"status": "human_review", "stage": "targeted tests"})
        write_agent_artifact(state)
        post_human_review("targeted pre-merge test", reason, targeted)
        return
    post_agent_stage("targeted test", "passed", targeted.get("reason", "Passed"))

    diff = git("diff", "--no-ext-diff", "HEAD")[:MAX_DIFF_CHARS]
    print("\n[6] Independent local model review...")
    local = local_review(diff, targeted, triage)
    state["local_review"] = local
    if not local.get("approved"):
        reason = local.get("reason") or "Local reviewer did not approve."
        state.update({"status": "human_review", "stage": "local review"})
        write_agent_artifact(state)
        post_human_review("local review", reason, local)
        return
    post_agent_stage("local review", "passed", local.get("reason", "Approved"))

    print("\n[7] Creating candidate PR...")
    pr_url, branch = create_pr(applied)
    state.update({"pr_url": pr_url, "branch": branch})
    if not pr_url:
        reason = "The reviewed patch could not be committed or opened as a PR."
        state.update({"status": "human_review", "stage": "PR creation"})
        write_agent_artifact(state)
        post_human_review("PR creation", reason, {"branch": branch})
        return

    print("\n[8] Two-model cloud merge gate...")
    smart_model = os.environ.get("FINAL_SMART_MODEL", "gpt-5.5")
    second_model = os.environ.get("FINAL_SECOND_MODEL", "claude-sonnet-5")
    smart = cloud_review("openai", smart_model, diff, targeted, local, logs)
    second = cloud_review(
        "anthropic", second_model, diff, targeted, local, logs)
    state["cloud_reviews"] = [smart, second]
    if not smart.get("approved") or not second.get("approved"):
        reason = "Two independent cloud approvals were not obtained."
        state.update({"status": "human_review", "stage": "cloud merge gate"})
        write_agent_artifact(state)
        post_human_review("cloud merge gate", reason, {
            "pr_url": pr_url, "openai": smart, "anthropic": second,
        })
        return
    post_agent_stage(
        "cloud review", "passed",
        f"OpenAI `{smart_model}`: APPROVE\nAnthropic `{second_model}`: APPROVE",
    )

    if not AUTO_MERGE:
        reason = "Automatic merge is disabled for this run."
        state.update({"status": "human_review", "stage": "merge disabled"})
        write_agent_artifact(state)
        post_human_review("merge", reason, {"pr_url": pr_url})
        return

    print("\n[9] Merging approved PR...")
    merge = merge_pr(pr_url)
    state["merge"] = merge
    if not merge.get("merged"):
        state.update({"status": "human_review", "stage": "merge"})
        write_agent_artifact(state)
        post_human_review("merge", "GitHub did not merge the approved PR.", merge)
        return
    post_agent_stage("merge", "passed", f"Merged: {pr_url}")

    print("\n[10] Post-merge targeted rerun...")
    checkout = checkout_merged_default()
    state["post_merge_checkout"] = checkout
    if not checkout.get("passed"):
        state.update({"status": "human_review", "stage": "post-merge checkout"})
        write_agent_artifact(state)
        post_human_review(
            "post-merge verification", "Could not check out merged master.", checkout)
        return
    post_merge = run_targeted_tests(failing, logs)
    state["post_merge_tests"] = post_merge
    if not post_merge.get("passed"):
        state.update({"status": "human_review", "stage": "post-merge test"})
        write_agent_artifact(state)
        post_human_review(
            "post-merge verification",
            "The originally failing test did not pass after merge.", post_merge)
        return

    state.update({"status": "fixed", "stage": "complete"})
    write_agent_artifact(state)
    report = {
        "investigation": triage.get("evidence"),
        "fix": "\n".join(
            f"`{item['file_path']}`: {item['reason']}" for item in applied),
        "severity": "low",
    }
    resolution = (
        f"Merged {pr_url}. The originally failing tests passed before and "
        "after merge. OpenAI and Anthropic both approved the patch."
    )
    post_agent_stage("post-merge test", "passed", post_merge.get("reason", "Passed"))
    post_agent_report(report, resolution)
    print("\nDone.")


if __name__ == "__main__":
    main()
