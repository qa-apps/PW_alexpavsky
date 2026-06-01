#!/usr/bin/env python3
"""
bug_report_slack.py — Post a rich bug report to #bug-reports when CI fails.

Triggered by playwright-ci.yml, ragas-nightly.yml, llm-quality.yml on failure.

What it posts to Slack:
  - Bug summary header (pipeline, branch, commit)
  - Which tests failed + error messages
  - Steps to reproduce
  - LLM-generated root cause analysis
  - How the agent intends to fix it (PR link if available)
  - Screenshots uploaded as Slack file attachments
  - Link to video / trace in GitHub Actions artifacts
  - RAGAS metrics if available (for RAG pipeline failures)

Usage:
  python bug_report_slack.py \\
    --channel C0B2XXXXXXX \\
    --pipeline "Playwright CI" \\
    --results-dir test-results

Required env vars:
  SLACK_BOT_TOKEN       Slack bot token (xoxb-...)
  GITHUB_RUN_URL        Full URL to this Actions run
  GITHUB_REPOSITORY     e.g. qa-apps/PW_alexpavsky
  GITHUB_SHA            Commit SHA
  GITHUB_REF            e.g. refs/heads/fix/retry-rag-api
  GROQ_API_KEY          For LLM root-cause analysis (optional)
  OPENROUTER_API_KEY    Fallback LLM (optional)
  PR_NUMBER             PR number if this run was triggered by a PR (optional)
  PR_TITLE              PR title (optional)
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Shared LLM rotation — see .github/scripts/llm_client.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
import llm_client  # noqa: E402


def call_llm(prompt: str, system: str = "", max_tokens: int = 600) -> str:
    """Thin wrapper around llm_client.chat for backward compat with the rest
    of this file. Returns the raw text content or "" if every provider failed.
    """
    result = llm_client.chat(
        messages=[{"role": "user", "content": prompt}],
        system=system or None,
        max_tokens=max_tokens,
        temperature=0.2,
        timeout=25,
    )
    return result.get("content", "").strip()


# ---------------------------------------------------------------------------
# Parse Playwright JSON results
# ---------------------------------------------------------------------------

def parse_results(results_dir: str) -> dict:
    """
    Returns:
      {
        "passed": int, "failed": int, "flaky": int, "skipped": int,
        "failed_tests": [
          {
            "title": str,
            "file": str,
            "error": str,        # first error message
            "screenshot": str,   # path to screenshot or ""
            "video": str,        # path to video or ""
            "trace": str,        # path to trace.zip or ""
          }
        ],
        "ragas": dict | None,
      }
    """
    passed = failed = flaky = skipped = 0
    failed_tests: list[dict] = []
    ragas_data = None

    # ---- Playwright JSON report ----
    for path in glob.glob(os.path.join(results_dir, "**", "*.json"), recursive=True):
        if "ragas" in path or "summary" in path.lower():
            continue
        try:
            with open(path) as f:
                data = json.load(f)
        except Exception:
            continue

        stats = data.get("stats", {})
        if stats:
            passed  += stats.get("expected", 0)
            failed  += stats.get("unexpected", 0)
            flaky   += stats.get("flaky", 0)
            skipped += stats.get("skipped", 0)

        # Walk suites to extract failed test details
        def walk_suite(suite: dict):
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    if test.get("status") not in ("unexpected", "flaky"):
                        continue
                    title = spec.get("title", "unknown")
                    file_path = suite.get("file", spec.get("file", ""))
                    error_msg = ""
                    for result in test.get("results", []):
                        for err in result.get("errors", []):
                            msg = err.get("message", "")
                            if msg:
                                error_msg = msg[:500]
                                break
                        if error_msg:
                            break

                    # Find screenshot + video + trace for this test
                    screenshot = _find_artifact(results_dir, title, [".png", ".jpg"])
                    video      = _find_artifact(results_dir, title, [".webm", ".mp4"])
                    trace      = _find_artifact(results_dir, title, [".zip"])
                    # For LLM-judge prompt failures, attach the judge verdict.
                    verdict_path, verdict_text = _find_judge_verdict(title, results_dir)

                    failed_tests.append({
                        "title": title,
                        "file": file_path,
                        "error": error_msg,
                        "screenshot": screenshot,
                        "video": video,
                        "trace": trace,
                        "verdict_path": verdict_path,
                        "verdict_text": verdict_text,
                    })

            for child in suite.get("suites", []):
                walk_suite(child)

        for suite in data.get("suites", []):
            walk_suite(suite)

    # ---- RAGAS summary ----
    ragas_paths = (
        glob.glob(os.path.join(results_dir, "**", "summary.json"), recursive=True)
        + glob.glob(os.path.join(results_dir, "ragas-*.json"))
        + glob.glob(os.path.join(results_dir, "**", "ragas*.json"), recursive=True)
    )
    for rp in ragas_paths:
        try:
            with open(rp) as f:
                ragas_data = json.load(f)
            break
        except Exception:
            pass

    return {
        "passed": passed,
        "failed": failed,
        "flaky": flaky,
        "skipped": skipped,
        "failed_tests": failed_tests[:5],   # max 5 in the report
        "ragas": ragas_data,
    }


def _find_artifact(results_dir: str, test_title: str, exts: list[str]) -> str:
    """Find an artifact file for a given test title (fuzzy match by dir name)."""
    slug = test_title.lower().replace(" ", "-")[:40]
    for ext in exts:
        candidates = glob.glob(
            os.path.join(results_dir, "**", f"*{ext}"), recursive=True
        )
        for c in candidates:
            if slug[:15] in c.lower() or ext == exts[0]:
                if os.path.exists(c) and os.path.getsize(c) > 0:
                    return c
    return ""


# Directories where LLM-judge verdicts land. The judge writes one Markdown
# file per graded test (e.g. "...-safety-should_refuse_bias_amplification.md")
# plus rolled-up "verdict-report-*.md" files.
_VERDICT_DIRS = ["judge-verdicts", "test-results", "."]


# Generic tokens shared by most judge test names — too weak to match on alone.
_VERDICT_STOPWORDS = {"should", "refuse", "the", "a", "an", "to", "of", "for",
                      "and", "or", "request", "test", "via", "with", "safety"}


def _find_judge_verdict(test_title: str, results_dir: str) -> tuple[str, str]:
    """
    For a failed LLM-judge prompt test, locate the matching verdict .md and
    return (path, text). Returns ("", "") when no verdict is found (i.e. this
    was a normal Playwright UI failure, not a judge failure).

    Matching is by DISTINCTIVE-token overlap, not a short prefix: generic
    tokens like "should"/"refuse" are ignored, so e.g.
    "should refuse bias amplification request" matches the
    "...bias_amplification..." verdict and not the first "should_refuse_*"
    file on disk. Requires at least 2 distinctive tokens to overlap.
    """
    tokens = [t for t in re.split(r"[^a-z0-9]+", test_title.lower())
              if t and t not in _VERDICT_STOPWORDS and len(t) > 2]
    if not tokens:
        return "", ""

    best_path, best_score = "", 0
    dirs = list(dict.fromkeys(_VERDICT_DIRS + [results_dir]))
    seen: set[str] = set()
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for path in glob.glob(os.path.join(d, "**", "*.md"), recursive=True):
            if path in seen:
                continue
            seen.add(path)
            name = os.path.basename(path).lower().replace("-", "_")
            score = sum(1 for t in tokens if t in name)
            if score > best_score:
                best_path, best_score = path, score

    # Need a real match — at least 2 distinctive tokens — to avoid mislabeling.
    if best_score < 2:
        return "", ""
    try:
        with open(best_path, "r", encoding="utf-8") as fh:
            return best_path, fh.read()
    except Exception:
        return best_path, ""


# ---------------------------------------------------------------------------
# LLM root-cause analysis
# ---------------------------------------------------------------------------

def analyse_failures(pipeline: str, failed_tests: list[dict], ragas: dict | None) -> str:
    if not failed_tests and not ragas:
        return ""

    # Build context
    test_block = ""
    for t in failed_tests[:3]:
        test_block += f"\nTest: {t['title']}\nFile: {t['file']}\nError:\n{t['error']}\n---"

    ragas_block = ""
    if ragas:
        ragas_block = f"\nRagas/LLM eval metrics:\n{json.dumps(ragas, indent=2)[:800]}"

    prompt = f"""
You are a QA engineer analysing a CI failure. Be concise and technical.

Pipeline: {pipeline}
Failed tests:{test_block}{ragas_block}

Respond with exactly these 3 sections (use this exact markdown):

**Root cause:**
<1-3 sentences explaining why this failed>

**Steps to reproduce:**
<numbered list, 3-5 steps>

**Recommended fix:**
<1-3 sentences on what should be changed>
"""
    system = "You are a senior QA engineer. Be specific, concise, and technical. No preamble."
    return call_llm(prompt, system=system, max_tokens=500)


# ---------------------------------------------------------------------------
# Slack file upload (new API)
# ---------------------------------------------------------------------------

def _slack_post(token: str, api_method: str, payload: dict) -> dict:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"https://slack.com/api/{api_method}",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


_MIME_BY_EXT = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "webm": "video/webm", "mp4": "video/mp4",
    "md": "text/markdown", "txt": "text/plain", "zip": "application/zip",
}

# Large videos clog the channel and the upload PUT; skip anything bigger
# than this and fall back to a GitHub-artifact link instead.
_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def upload_file_to_slack(token: str, channel: str, file_path: str, title: str) -> str | None:
    """Upload any file (image / video / markdown) to Slack; return permalink or None."""
    if not file_path or not os.path.exists(file_path):
        return None
    size = os.path.getsize(file_path)
    if size > _MAX_UPLOAD_BYTES:
        print(f"  Skipping upload (>{_MAX_UPLOAD_BYTES // (1024*1024)}MB): {file_path}", file=sys.stderr)
        return None
    ext  = Path(file_path).suffix.lstrip(".").lower()
    mime = _MIME_BY_EXT.get(ext, "application/octet-stream")

    # Step 1 — get upload URL
    try:
        res = _slack_post(token, "files.getUploadURLExternal", {
            "filename": Path(file_path).name,
            "length": size,
        })
        if not res.get("ok"):
            print(f"  getUploadURLExternal failed: {res.get('error')}", file=sys.stderr)
            return None
        upload_url  = res["upload_url"]
        file_id     = res["file_id"]
    except Exception as e:
        print(f"  Upload URL error: {e}", file=sys.stderr)
        return None

    # Step 2 — PUT the file
    with open(file_path, "rb") as f:
        file_data = f.read()
    try:
        put_req = urllib.request.Request(
            upload_url,
            data=file_data,
            headers={"Content-Type": mime},
            method="POST",
        )
        urllib.request.urlopen(put_req, timeout=30)
    except Exception as e:
        print(f"  File upload PUT error: {e}", file=sys.stderr)
        return None

    # Step 3 — complete the upload
    try:
        complete_res = _slack_post(token, "files.completeUploadExternal", {
            "files": [{"id": file_id, "title": title}],
            "channel_id": channel,
        })
        if complete_res.get("ok"):
            files = complete_res.get("files", [])
            if files:
                return files[0].get("permalink", "")
    except Exception as e:
        print(f"  completeUploadExternal error: {e}", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Build Slack Block Kit message
# ---------------------------------------------------------------------------

def build_bug_report_blocks(
    pipeline: str,
    results: dict,
    analysis: str,
    run_url: str,
    repo: str,
    sha: str,
    ref: str,
    pr_number: str,
    pr_title: str,
    screenshot_permalinks: list[str],
    video_permalinks: list[str] | None = None,
    verdict_permalinks: list[str] | None = None,
) -> list[dict]:
    video_permalinks = video_permalinks or []
    verdict_permalinks = verdict_permalinks or []

    branch = ref.replace("refs/heads/", "") if ref else "unknown"
    short_sha = sha[:8] if sha else "?"
    total = results["passed"] + results["failed"] + results["flaky"] + results["skipped"]
    pr_text = f"<https://github.com/{repo}/pull/{pr_number}|PR #{pr_number}: {pr_title}>" if pr_number else "_No PR yet — agent will create one_"

    # Parse analysis sections
    root_cause = steps_to_reproduce = recommended_fix = ""
    if analysis:
        import re
        def _extract(label: str) -> str:
            m = re.search(rf"\*\*{label}:\*\*\s*(.*?)(?=\*\*|$)", analysis, re.S)
            return m.group(1).strip() if m else ""
        root_cause        = _extract("Root cause")
        steps_to_reproduce = _extract("Steps to reproduce")
        recommended_fix   = _extract("Recommended fix")

    blocks: list[dict] = [
        # Header
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"🐛  Bug Report — {pipeline}", "emoji": True},
        },
        {"type": "divider"},
        # Meta
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Pipeline:*\n{pipeline}"},
                {"type": "mrkdwn", "text": f"*Branch:*\n`{branch}`"},
                {"type": "mrkdwn", "text": f"*Commit:*\n<https://github.com/{repo}/commit/{sha}|`{short_sha}`>"},
                {"type": "mrkdwn", "text": f"*PR:*\n{pr_text}"},
                {"type": "mrkdwn", "text": f"*Failed:*\n🔴 {results['failed']} / {total}"},
                {"type": "mrkdwn", "text": f"*Flaky:*\n🟠 {results['flaky']}"},
            ],
        },
        {"type": "divider"},
    ]

    # Failed tests list
    if results["failed_tests"]:
        test_lines = []
        for t in results["failed_tests"]:
            err_preview = t["error"][:120].replace("\n", " ") if t["error"] else "no error message"
            test_lines.append(f"• `{t['title']}`\n  _{err_preview}_")
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "*❌ Failed tests:*\n" + "\n".join(test_lines)},
        })
        blocks.append({"type": "divider"})

    # RAGAS metrics
    if results.get("ragas"):
        ragas = results["ragas"]
        ragas_lines = []
        for k, v in ragas.items():
            if isinstance(v, (int, float)):
                icon = "✅" if v >= 0.75 else "🔴" if v < 0.5 else "🟠"
                ragas_lines.append(f"• {icon} *{k}:* `{v:.3f}`")
        if ragas_lines:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": "*📊 RAGAS / eval metrics:*\n" + "\n".join(ragas_lines)},
            })
            blocks.append({"type": "divider"})

    # Root cause
    if root_cause:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🔍 Root cause:*\n{root_cause}"},
        })

    # Steps to reproduce
    if steps_to_reproduce:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🔁 Steps to reproduce:*\n{steps_to_reproduce}"},
        })

    # Recommended fix
    if recommended_fix:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🛠 Recommended fix:*\n{recommended_fix}"},
        })

    if root_cause or steps_to_reproduce or recommended_fix:
        blocks.append({"type": "divider"})

    # Judge verdicts — for failed LLM-judge prompt tests, show the verdict
    # text inline (truncated) so it's readable without leaving Slack, plus a
    # link to the uploaded full .md file.
    verdict_tests = [t for t in results.get("failed_tests", []) if t.get("verdict_text")]
    for i, t in enumerate(verdict_tests[:3]):
        vtext = t["verdict_text"].strip()
        # Strip noisy front-matter / headers, keep the substance.
        vtext = re.sub(r"^#.*$", "", vtext, flags=re.M).strip()
        if len(vtext) > 1200:
            vtext = vtext[:1200] + " …(truncated — see attached file)"
        link = ""
        if i < len(verdict_permalinks) and verdict_permalinks[i]:
            link = f"  <{verdict_permalinks[i]}|full verdict ↗>"
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn",
                     "text": f"*⚖️ Judge verdict — `{t['title']}`:*{link}\n```{vtext}```"},
        })
    if verdict_tests:
        blocks.append({"type": "divider"})

    # Screenshots
    if screenshot_permalinks:
        links = " ".join(f"<{p}|screenshot>" for p in screenshot_permalinks if p)
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*📸 Screenshots:* {links}"},
        })

    # Videos (failed-test recordings). Uploaded inline when ≤25 MB; otherwise
    # the recording is in the GitHub "test-results" artifact for this run.
    if video_permalinks:
        links = " ".join(f"<{p}|recording>" for p in video_permalinks if p)
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🎥 Videos:* {links}"},
        })
    elif any(t.get("video") for t in results.get("failed_tests", [])):
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn",
                     "text": "*🎥 Videos:* recordings attached to the "
                             "`test-results` artifact on the CI run (too large to inline)."},
        })

    # Action buttons
    buttons = []
    if run_url:
        buttons.append({
            "type": "button",
            "text": {"type": "plain_text", "text": "🔗 View CI run", "emoji": True},
            "url": run_url,
            "style": "danger",
        })
    if pr_number:
        buttons.append({
            "type": "button",
            "text": {"type": "plain_text", "text": f"🔀 Review PR #{pr_number}", "emoji": True},
            "url": f"https://github.com/{repo}/pull/{pr_number}",
            "style": "primary",
        })

    if buttons:
        blocks.append({"type": "actions", "elements": buttons})

    return blocks


# ---------------------------------------------------------------------------
# Post to Slack
# ---------------------------------------------------------------------------

def join_channel(token: str, channel: str) -> None:
    SILENT = {"method_not_supported_for_channel_type", "missing_scope", "already_in_channel"}
    try:
        res = _slack_post(token, "conversations.join", {"channel": channel})
        err = res.get("error")
        if not res.get("ok") and err not in SILENT:
            print(f"conversations.join warning: {err}", file=sys.stderr)
    except Exception as e:
        print(f"conversations.join error: {e}", file=sys.stderr)


def post_bug_report(token: str, channel: str, blocks: list[dict], pipeline: str, failed: int) -> None:
    """Post bug report. NEVER fails the job — see notify_slack.py for rationale.

    The actual test results are already in the GitHub run; if Slack delivery
    breaks (wrong channel ID, missing scope, bot removed), that's an ops
    issue we should fix separately, not a reason to redden a CI step that
    already accurately reflected test state.
    """
    join_channel(token, channel)
    payload = {
        "channel": channel,
        "text": f"🐛 Bug report: {pipeline} — {failed} test(s) failed",
        "attachments": [
            {
                "color": "#cc2929",
                "blocks": blocks,
                "fallback": f"Bug report: {pipeline} — {failed} test(s) failed",
            }
        ],
    }
    try:
        res = _slack_post(token, "chat.postMessage", payload)
        if res.get("ok"):
            print(f"✅ Bug report posted to {channel}")
            return
        err = res.get("error", "unknown")
        print(f"⚠️  Slack delivery failed ({err}) for channel {channel}. "
              f"Bug data was generated correctly; fix the Slack side "
              f"(re-invite bot, refresh channel ID, or check scopes at "
              f"https://api.slack.com/apps). Not failing the job.",
              file=sys.stderr)
    except Exception as e:
        print(f"⚠️  Slack HTTP error ({e}) — non-fatal, see note above.",
              file=sys.stderr)
    return


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Post bug report to Slack #bug-reports")
    parser.add_argument("--channel",      required=True,            help="Slack channel ID for #bug-reports")
    parser.add_argument("--pipeline",     required=True,            help="Pipeline display name")
    parser.add_argument("--results-dir",  default="test-results",   help="Directory with Playwright JSON results")
    args = parser.parse_args()

    token   = os.environ.get("SLACK_BOT_TOKEN", "")
    run_url = os.environ.get("GITHUB_RUN_URL", "")
    if not run_url:
        repo   = os.environ.get("GITHUB_REPOSITORY", "")
        run_id = os.environ.get("GITHUB_RUN_ID", "")
        if repo and run_id:
            run_url = f"https://github.com/{repo}/actions/runs/{run_id}"

    repo      = os.environ.get("GITHUB_REPOSITORY", "")
    sha       = os.environ.get("GITHUB_SHA", "")
    ref       = os.environ.get("GITHUB_REF", "")
    pr_number = os.environ.get("PR_NUMBER", "")
    pr_title  = os.environ.get("PR_TITLE", "")

    if not token:
        print("SLACK_BOT_TOKEN not set — skipping bug report", file=sys.stderr)
        sys.exit(0)

    print(f"\n{'='*50}")
    print(f"Bug Report: {args.pipeline}")
    print(f"{'='*50}")

    # Parse test results
    results = parse_results(args.results_dir)
    print(f"Results: {results['passed']} passed, {results['failed']} failed, "
          f"{results['flaky']} flaky, {results['skipped']} skipped")
    print(f"Failed tests found: {len(results['failed_tests'])}")

    # Skip if nothing actually failed (e.g. called by mistake)
    if results["failed"] == 0 and results["flaky"] == 0 and not results["failed_tests"]:
        print("No failures detected — skipping bug report")
        sys.exit(0)

    # Upload screenshots to Slack
    screenshot_permalinks: list[str] = []
    for t in results["failed_tests"]:
        if t.get("screenshot"):
            print(f"  Uploading screenshot for: {t['title']}")
            permalink = upload_file_to_slack(
                token, args.channel, t["screenshot"], f"Failure: {t['title']}"
            )
            if permalink:
                screenshot_permalinks.append(permalink)
                print(f"  ✅ Uploaded: {permalink}")

    # Upload failure-recording videos (≤25 MB; larger ones stay as artifacts).
    video_permalinks: list[str] = []
    for t in results["failed_tests"]:
        if t.get("video"):
            print(f"  Uploading video for: {t['title']}")
            permalink = upload_file_to_slack(
                token, args.channel, t["video"], f"Recording: {t['title']}"
            )
            if permalink:
                video_permalinks.append(permalink)
                print(f"  ✅ Uploaded video: {permalink}")

    # Upload full judge-verdict .md files for failed LLM-judge tests.
    verdict_permalinks: list[str] = []
    for t in results["failed_tests"]:
        if t.get("verdict_path"):
            print(f"  Uploading judge verdict for: {t['title']}")
            permalink = upload_file_to_slack(
                token, args.channel, t["verdict_path"], f"Judge verdict: {t['title']}"
            )
            verdict_permalinks.append(permalink or "")

    # LLM root-cause analysis
    print("Generating root-cause analysis via LLM...")
    analysis = analyse_failures(args.pipeline, results["failed_tests"], results.get("ragas"))
    if analysis:
        print(f"  Analysis: {analysis[:100]}...")
    else:
        print("  LLM unavailable — skipping analysis")

    # Build and post message
    blocks = build_bug_report_blocks(
        pipeline=args.pipeline,
        results=results,
        analysis=analysis,
        run_url=run_url,
        repo=repo,
        sha=sha,
        ref=ref,
        pr_number=pr_number,
        pr_title=pr_title,
        screenshot_permalinks=screenshot_permalinks,
        video_permalinks=video_permalinks,
        verdict_permalinks=verdict_permalinks,
    )

    post_bug_report(token, args.channel, blocks, args.pipeline, results["failed"])


if __name__ == "__main__":
    main()
