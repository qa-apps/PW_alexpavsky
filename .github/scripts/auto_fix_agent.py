#!/usr/bin/env python3
"""
auto_fix_agent.py — AI-powered auto-fix agent running in GitHub Actions.

Triggered by auto-fix.yml when any CI pipeline fails.
Workflow:
  1. Download failure logs from GitHub Actions API
  2. Find which test files are failing
  3. Call LLM (rotating through all configured providers) with logs + files
  4. Apply the suggested file patches
  5. Push a fix branch and open a PR with alexpavsky as reviewer

The agent never merges — it only opens a PR for human review.

LLM rotation lives in .github/scripts/llm_client.py — same provider list
as eval/rotating_llm.py. When one provider returns 401/403/429 the next
one is tried automatically, so a single rotated key doesn't break the
whole pipeline.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
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
GH_TOKEN  = os.environ.get("GITHUB_TOKEN", "")

MAX_LOG_CHARS  = 18000
MAX_FILE_CHARS = 12000


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
    zip_path = Path("/tmp/ci_logs.zip")
    log_dir  = Path("/tmp/ci_logs")
    zip_path.write_bytes(raw)
    log_dir.mkdir(exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(log_dir)
    except Exception as e:
        print(f"  Log zip extract error: {e}", file=sys.stderr)
        return ""

    parts: list[str] = []
    for log_file in sorted(log_dir.rglob("*.txt"))[:8]:
        text = log_file.read_text(errors="replace")
        # Keep only the last 3000 chars of each log (tail has the errors)
        parts.append(f"=== {log_file.name} ===\n{text[-3000:]}")

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
    """Extract paths to test files mentioned in failure logs."""
    patterns = [
        r"(tests?/[\w/.-]+\.spec\.ts)",
        r"(tests?/[\w/.-]+\.spec\.js)",
        r"(tests?/[\w/.-]+_test\.py)",
        r"(tests?/[\w/.-]+\.py)",
        r"(e2e/[\w/.-]+\.spec\.ts)",
        r"FAILED\s+(tests?/[\w/.-]+)",
        r"● ([\w /.-]+?) ›",
    ]
    found: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, logs):
            candidate = m.group(1).strip()
            if Path(candidate).exists():
                found.add(candidate)
    result = sorted(found)[:8]
    # If nothing found, fall back to all test files
    if not result:
        for glob in ["tests/**/*.spec.ts", "tests/**/*.py", "e2e/**/*.spec.ts"]:
            result += [str(p) for p in Path(".").glob(glob)][:3]
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


# ---------------------------------------------------------------------------
# LLM calls
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "edit_file",
        "description": (
            "Apply a targeted fix to a test file. "
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

SYSTEM_PROMPT = """You are an expert QA engineer fixing failing automated tests in CI.

Rules:
- ONLY fix test code (*.spec.ts, *.spec.js, *_test.py, conftest.py). Never touch application code.
- Make the minimal change needed to fix the failure.
- Fix root causes: broken selectors, timing issues, changed API responses, wrong assertions.
- Do NOT add arbitrary waitForTimeout() calls or sleep() — fix the underlying cause.
- Use POM selectors where they exist; do not add raw page.locator() in spec bodies.
- If you are not confident in a fix, call give_up instead of guessing.
- Call edit_file once per logical change. You may call it multiple times for multiple files."""


def build_prompt(logs: str, files: str) -> str:
    return f"""Pipeline: {PIPELINE}
Failed run: {RUN_URL}

## CI failure logs (truncated to last ~3000 chars per job):
{logs}

## Test file contents:
{files}

Analyze the failure. If you can determine a confident, minimal fix, call edit_file.
If the failure requires application changes or you cannot determine the root cause safely, call give_up."""


def call_llm(logs: str, files: str) -> tuple[list[dict], str]:
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
        messages=[{"role": "user", "content": build_prompt(logs, files)}],
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
# Git + GitHub PR
# ---------------------------------------------------------------------------

def git(*args: str) -> str:
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    if result.returncode != 0 and args[0] not in ("diff",):
        print(f"  git {' '.join(args)}: {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip()


def create_pr(fixes: list[dict]) -> None:
    slug      = re.sub(r"[^a-z0-9]+", "-", PIPELINE.lower())[:25].strip("-")
    short_sha = (HEAD_SHA or "unknown")[:8]
    branch    = f"fix/{slug}-{short_sha}"

    git("checkout", "-b", branch)
    git("add", "-A")

    # Commit message
    files_changed = sorted({f["file_path"] for f in fixes})
    fix_lines = "\n".join(f"- {f['file_path']}: {f['reason']}" for f in fixes)
    commit_msg = (
        f"fix(tests): auto-fix {PIPELINE} failures\n\n"
        f"Failing CI run: {RUN_URL}\n"
        f"Files changed: {', '.join(files_changed)}"
    )
    git("commit", "-m", commit_msg)
    git("push", "origin", branch)

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

    result = subprocess.run(
        [
            "gh", "pr", "create",
            "--title", f"fix: auto-fix {PIPELINE} ({short_sha})",
            "--body", pr_body,
            "--reviewer", "alexpavsky",
            "--label", "bug-fix",
            "--head", branch,
            "--base", "master",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print(f"  ✅ PR created: {result.stdout.strip()}")
    else:
        print(f"  ⚠ PR creation failed: {result.stderr.strip()}", file=sys.stderr)
        # Try without reviewer in case alexpavsky is not yet a collaborator
        subprocess.run(
            [
                "gh", "pr", "create",
                "--title", f"fix: auto-fix {PIPELINE} ({short_sha})",
                "--body", pr_body,
                "--label", "bug-fix",
                "--head", branch,
                "--base", "master",
            ],
            check=True,
        )
        print("  ✅ PR created (without reviewer)")


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

    if not llm_client.configured_providers():
        print("No LLM API keys in env (need one of: "
              "GROQ_API_KEY, CEREBRAS_API_KEY, SAMBANOVA_API_KEY, "
              "MISTRAL_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, HF_TOKEN)",
              file=sys.stderr)
        sys.exit(1)

    # 1. Get logs
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
        print("  No logs available — cannot fix. Exiting.")
        sys.exit(0)

    print(f"  Got {len(logs)} chars of logs")

    # 2. Find failing files
    print("\n[2] Identifying failing test files...")
    failing = find_failing_files(logs)
    print(f"  Found: {failing or '(none — will scan all tests)'}")
    file_content = read_files(failing)

    # 3. Call LLM (rotates through all configured providers)
    print("\n[3] Calling LLM for fix analysis...")
    tool_uses, provider = call_llm(logs, file_content)
    if not tool_uses:
        print("  No LLM produced a usable fix — exiting cleanly.")
        sys.exit(0)
    print(f"  Fix author: {provider}")

    # 4. Apply fixes
    print("\n[4] Applying fixes...")
    applied = apply_fixes(tool_uses)
    if not applied:
        print("  No fixes could be applied safely.")
        sys.exit(0)

    # 5. Check for actual changes
    if not git("diff", "--name-only", "HEAD"):
        print("  No file changes after applying fixes.")
        sys.exit(0)

    # 6. Create PR
    print("\n[5] Creating PR...")
    create_pr(applied)
    print("\nDone.")


if __name__ == "__main__":
    main()
