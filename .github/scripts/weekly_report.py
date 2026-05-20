#!/usr/bin/env python3
"""
weekly_report.py — Weekly QA Report generator for alexpavsky.com.

Runs in GitHub Actions every Sunday. Uses the same open-source LLM rotation
as the site (Groq → Cerebras → OpenRouter). Zero Anthropic tokens.

Delivers reports to:
  1. Slack  (SLACK_WEBHOOK_URL)
  2. Site   (POST https://alexpavsky.com/api/agent-reports with MAINTENANCE_KEY)
  3. File   (judge-verdicts/weekly-report-YYYY-MM-DD.md)
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GROQ_KEY       = os.environ.get("GROQ_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
CEREBRAS_KEY   = os.environ.get("CEREBRAS_API_KEY", "")
SLACK_URL      = os.environ.get("SLACK_WEBHOOK_URL", "")
SITE_URL       = os.environ.get("SITE_REPORTS_URL", "")
MAINT_KEY      = os.environ.get("MAINTENANCE_KEY", "")
RUN_URL        = os.environ.get("GITHUB_RUN_URL", "")

VERDICTS_DIR   = Path("judge-verdicts")
TEST_RESULTS   = Path("test-results")
REPORT_DATE    = datetime.now(tz=timezone.utc)
WEEK_START     = REPORT_DATE - timedelta(days=7)

LLM_PROVIDERS = [
    ("groq",     GROQ_KEY,       "https://api.groq.com/openai/v1",      "llama-3.3-70b-versatile"),
    ("cerebras", CEREBRAS_KEY,   "https://api.cerebras.ai/v1",          "llama-3.3-70b"),
    ("or-llama", OPENROUTER_KEY, "https://openrouter.ai/api/v1",        "meta-llama/llama-3.3-70b-instruct:free"),
    ("or-qwen",  OPENROUTER_KEY, "https://openrouter.ai/api/v1",        "qwen/qwen3-coder:free"),
]

# ---------------------------------------------------------------------------
# LLM call with rotation (same pattern as rag/main.py)
# ---------------------------------------------------------------------------
def call_llm(prompt: str, system: str = "") -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for name, key, base_url, model in LLM_PROVIDERS:
        if not key:
            continue
        try:
            r = httpx.post(
                f"{base_url}/chat/completions",
                json={"model": model, "messages": messages, "max_tokens": 1500},
                headers={"Authorization": f"Bearer {key}",
                         "HTTP-Referer": "https://alexpavsky.com"},
                timeout=30,
            )
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"].strip()
            print(f"  [{name}] HTTP {r.status_code} — trying next", file=sys.stderr)
        except Exception as e:
            print(f"  [{name}] {e} — trying next", file=sys.stderr)

    return "LLM unavailable — all providers failed"

# ---------------------------------------------------------------------------
# Data collection
# ---------------------------------------------------------------------------
def collect_verdicts() -> dict:
    """Read triage and LLM judge files from this week."""
    data = {"triage": [], "weekly": [], "raw_text": ""}
    if not VERDICTS_DIR.exists():
        return data

    texts = []
    for f in sorted(VERDICTS_DIR.glob("*.md")):
        try:
            mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
            if mtime < WEEK_START:
                continue
            content = f.read_text(errors="replace")
            texts.append(f"### {f.name}\n{content[:2000]}")
            if "triage" in f.name:
                data["triage"].append(content)
            elif "weekly" in f.name:
                data["weekly"].append(content)
        except Exception:
            pass

    data["raw_text"] = "\n\n".join(texts[:10])  # max 10 files
    return data

def collect_test_counts() -> dict:
    """Parse test-results/ JSON files for pass/fail counts."""
    counts = {"passed": 0, "failed": 0, "skipped": 0, "total": 0}
    if not TEST_RESULTS.exists():
        return counts
    for f in TEST_RESULTS.rglob("*.json"):
        try:
            d = json.loads(f.read_text(errors="replace"))
            # Playwright result JSON
            if "stats" in d:
                s = d["stats"]
                counts["passed"]  += s.get("expected", 0)
                counts["failed"]  += s.get("unexpected", 0)
                counts["skipped"] += s.get("skipped", 0)
        except Exception:
            pass
    counts["total"] = counts["passed"] + counts["failed"] + counts["skipped"]
    return counts

# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------
def generate_report(verdicts: dict, counts: dict) -> str:
    period = f"{WEEK_START.strftime('%b %d')} – {REPORT_DATE.strftime('%b %d, %Y')}"

    # Count bugs and fixes from triage files
    site_bugs = sum(t.count("SITE BUG") for t in verdicts["triage"])
    tests_fixed = sum(t.count("TEST FIXED") for t in verdicts["triage"])
    env_issues = sum(t.count("ENV ISSUE") for t in verdicts["triage"])

    context = f"""
Weekly QA data for alexpavsky.com — period {period}:

Test results: {counts['passed']} passed / {counts['failed']} failed / {counts['skipped']} skipped
  (total: {counts['total']} tests)

Triage reports this week:
  Site bugs found: {site_bugs}
  Tests fixed: {tests_fixed}
  Environment issues: {env_issues}

Raw verdict excerpts:
{verdicts['raw_text'][:3000] or '(no verdicts this week)'}
""".strip()

    system = (
        "You are a QA analyst writing a concise weekly report for a developer. "
        "Be specific, direct, and data-driven. Use markdown. Keep it under 500 words."
    )
    prompt = f"""
Based on this week's QA data, write a weekly report with these sections:
1. Summary table (tests, bugs, fixes, env issues)
2. Notable issues (if any)
3. What improved
4. Top 2–3 recommended actions for next week

Data:
{context}
"""
    return call_llm(prompt, system=system)

# ---------------------------------------------------------------------------
# Delivery
# ---------------------------------------------------------------------------
def save_to_file(report_md: str) -> Path:
    VERDICTS_DIR.mkdir(exist_ok=True)
    out = VERDICTS_DIR / f"weekly-report-{REPORT_DATE.strftime('%Y-%m-%d')}.md"
    header = f"# Weekly QA Report — alexpavsky.com\n**Generated:** {REPORT_DATE.isoformat()}\n\n"
    out.write_text(header + report_md)
    print(f"✅ Saved: {out}")
    return out

def send_to_slack(report_md: str, counts: dict) -> None:
    if not SLACK_URL:
        print("⚠️  SLACK_WEBHOOK_URL not set — skipping Slack")
        return

    # Compact Slack message — full report is in the site
    period = f"{WEEK_START.strftime('%b %d')} – {REPORT_DATE.strftime('%b %d, %Y')}"
    status = "✅" if counts["failed"] == 0 else "⚠️" if counts["failed"] < 5 else "🔴"
    summary_lines = []
    for line in report_md.splitlines():
        if line.strip().startswith("|") or line.strip().startswith("#") or ("bug" in line.lower()) or ("fix" in line.lower()):
            summary_lines.append(line)
        if len("\n".join(summary_lines)) > 1500:
            break

    slack_text = (
        f"{status} *Weekly QA Report — {period}*\n"
        f"Tests: `{counts['passed']} passed` / `{counts['failed']} failed`\n\n"
        + "\n".join(summary_lines[:20])
    )
    if RUN_URL:
        slack_text += f"\n\n<{RUN_URL}|View full run on GitHub Actions>"

    payload = {
        "text": slack_text[:2900],
        "unfurl_links": False,
    }
    try:
        r = httpx.post(SLACK_URL, json=payload, timeout=10)
        if r.status_code == 200:
            print("✅ Sent to Slack")
        else:
            print(f"⚠️  Slack returned HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"⚠️  Slack send failed: {e}")

def post_to_site(report_md: str, counts: dict) -> None:
    if not SITE_URL or not MAINT_KEY:
        print("⚠️  SITE_REPORTS_URL or MAINTENANCE_KEY not set — skipping site post")
        return

    payload = {
        "key":     MAINT_KEY,
        "source":  "weekly-report",
        "title":   f"Weekly QA Report — {REPORT_DATE.strftime('%Y-%m-%d')}",
        "content": report_md,
        "meta": {
            "passed":  counts["passed"],
            "failed":  counts["failed"],
            "skipped": counts["skipped"],
            "run_url": RUN_URL,
        },
    }
    try:
        r = httpx.post(SITE_URL, json=payload, timeout=15)
        if r.status_code == 200:
            print(f"✅ Posted to site: {SITE_URL}")
        else:
            print(f"⚠️  Site returned HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"⚠️  Site post failed: {e}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    period = f"{WEEK_START.strftime('%b %d')} – {REPORT_DATE.strftime('%b %d, %Y')}"
    print(f"\n{'='*50}")
    print(f"Weekly QA Report Generator — {period}")
    print(f"{'='*50}\n")

    verdicts = collect_verdicts()
    counts   = collect_test_counts()

    print(f"Tests found:    {counts['total']} ({counts['passed']} passed, {counts['failed']} failed)")
    print(f"Verdict files:  {len(verdicts['triage'])} triage, {len(verdicts['weekly'])} weekly")
    print("Generating report via open-source LLM rotation...")

    report_md = generate_report(verdicts, counts)
    print(f"\n--- Report preview (first 300 chars) ---\n{report_md[:300]}\n---\n")

    save_to_file(report_md)
    send_to_slack(report_md, counts)
    post_to_site(report_md, counts)

    print(f"\nDone. {'🔴 ' + str(counts['failed']) + ' tests failed!' if counts['failed'] else '✅ All tests passing.'}")

if __name__ == "__main__":
    main()
