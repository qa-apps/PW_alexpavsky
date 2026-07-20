#!/usr/bin/env python3
"""Post Giskard RAG-eval + vulnerability-scan results to a dedicated Slack channel.

Reads the two JSON summaries written by eval/giskard_rag.py
(`giskard_rag.json`: correctness) and eval/giskard_scan.py
(`giskard_scan.json`: total_issues + issues_by_category) and posts a compact
Block Kit message via chat.postMessage.

No-ops (exit 0) when SLACK_BOT_TOKEN or the channel is unset, and never fails
the job — notification is best-effort.

Usage:
  python notify_giskard_slack.py --channel "$SLACK_GISKARD_CHANNEL_ID" \
      --results-dir eval/results [--run-url URL]

Env:
  SLACK_BOT_TOKEN   Slack bot token (xoxb-...). If unset, the script no-ops.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

SLACK_POST_URL = "https://slack.com/api/chat.postMessage"


def _load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _correctness_emoji(value) -> str:
    if value is None:
        return "⚪"
    if value >= 0.75:
        return "🟢"
    if value >= 0.5:
        return "🟠"
    return "🔴"


def build_text(rag: dict, scan: dict) -> tuple[str, str]:
    correctness = rag.get("correctness")
    total_issues = scan.get("total_issues")

    # Overall status: red if any vuln issue found or correctness below 0.5.
    bad = (isinstance(total_issues, int) and total_issues > 0) or (
        isinstance(correctness, (int, float)) and correctness < 0.5
    )
    header_emoji = "🔴" if bad else "🟢"
    lines = [f"{header_emoji} *Giskard — RAG eval + vulnerability scan*"]

    if rag:
        c_txt = "n/a" if correctness is None else f"{correctness:.2f}"
        lines.append(
            f"{_correctness_emoji(correctness)} *RAG correctness:* {c_txt}"
            f"  ·  questions: {rag.get('num_questions', '?')}"
            f"  ·  judge: {rag.get('judge', '?')}"
        )
    else:
        lines.append("⚪ RAG eval: no results file")

    if scan:
        n = scan.get("total_issues", 0)
        scan_emoji = "🟢" if n == 0 else "🔴"
        by_cat = scan.get("issues_by_category", {}) or {}
        hits = ", ".join(f"{c}:{v}" for c, v in by_cat.items() if v) or "none"
        lines.append(
            f"{scan_emoji} *Vuln scan:* {n} issue(s) across "
            f"{len(scan.get('categories', []))} categories  ·  {hits}"
        )
    else:
        lines.append("⚪ Vuln scan: no results file")

    return "Giskard eval results", "\n".join(lines)


def post(channel: str, token: str, fallback: str, text: str, run_url: str) -> None:
    blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]
    if run_url:
        blocks.append({
            "type": "actions",
            "elements": [{
                "type": "button",
                "text": {"type": "plain_text", "text": "Open workflow run"},
                "url": run_url,
            }],
        })
    payload = json.dumps(
        {"channel": channel, "text": fallback, "blocks": blocks}
    ).encode()
    req = urllib.request.Request(
        SLACK_POST_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
        if not body.get("ok"):
            print(f"WARNING: Slack API error: {body.get('error')}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"WARNING: Slack post failed: {exc}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--channel", default="")
    parser.add_argument("--results-dir", default="eval/results")
    parser.add_argument("--run-url", default=os.environ.get("GITHUB_RUN_URL", ""))
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    channel = (args.channel or "").strip()
    if not token or not channel:
        print("SLACK_BOT_TOKEN or channel not set — skipping Giskard Slack post.")
        return 0

    results = Path(args.results_dir)
    rag = _load(results / "giskard_rag.json")
    scan = _load(results / "giskard_scan.json")
    fallback, text = build_text(rag, scan)
    post(channel, token, fallback, text, args.run_url)
    print("Posted Giskard summary to Slack.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
