#!/usr/bin/env python3
"""
notify_promptfoo_slack.py — post a promptfoo Basic Evaluation summary to Slack.

Mirrors notify_k6_slack.py: reads the JSON produced by
`promptfoo eval -o <file>.json`, builds a Slack Block-Kit message with a
pass/fail donut and per-test detail, and posts it via chat.postMessage.

Usage:
  python .github/scripts/notify_promptfoo_slack.py \
    --channel CHANNEL_ID --results promptfoo-results.json

Env:
  SLACK_BOT_TOKEN     Slack bot token (xoxb-...). If unset, the script no-ops.
  GITHUB_RUN_URL      Optional link surfaced as a "View run" button.
"""
import argparse
import json
import os
import sys
import urllib.request


def load_results(path: str) -> list[dict]:
    """Normalize promptfoo JSON into a flat [{label, description, passed}] list."""
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    # promptfoo shape: { results: { results: [ {success, provider, testCase}... ] } }
    raw = (
        data.get("results", {}).get("results")
        if isinstance(data.get("results"), dict)
        else data.get("results")
    ) or []
    flat = []
    for r in raw:
        provider = r.get("provider")
        label = (provider or {}).get("label") if isinstance(provider, dict) else provider
        desc = (r.get("testCase") or {}).get("description") or (
            (r.get("vars") or {}).get("prompt", "")[:48]
        )
        flat.append({
            "label": label or "provider",
            "description": desc or "test",
            "passed": bool(r.get("success")),
        })
    return flat


def build_donut(passed: int, failed: int) -> str:
    total = passed + failed
    if not total:
        return "—"
    filled = round((passed / total) * 10)
    return f"`{'🟩' * filled}{'🟥' * (10 - filled)}`  {passed}/{total} passed"


def build_payload(channel: str, run_url: str, results: list[dict]) -> dict:
    passed = sum(1 for r in results if r["passed"])
    failed = len(results) - passed
    total = len(results)

    if failed:
        color, icon, status = "#cc2929", "🔴", "FAILED"
    elif total:
        color, icon, status = "#2eb886", "✅", "PASSED"
    else:
        color, icon, status = "#e9a820", "🟠", "NO RESULTS"

    detail = []
    for r in results[:15]:
        mark = "✅" if r["passed"] else "🔴"
        detail.append(f"{mark} *{r['description']}* · {r['label']}")

    blocks = [
        {"type": "header", "text": {"type": "plain_text",
                                    "text": f"{icon}  promptfoo Basic Eval  —  {status}",
                                    "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": build_donut(passed, failed)}},
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*✅ Passed*\n{passed}"},
            {"type": "mrkdwn", "text": f"*🔴 Failed*\n{failed}"},
        ]},
    ]
    if detail:
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(detail)}})
    if run_url:
        blocks.append({"type": "actions", "elements": [{
            "type": "button",
            "text": {"type": "plain_text", "text": "🔗 View run", "emoji": True},
            "url": run_url,
            "style": "primary" if failed == 0 else "danger",
        }]})

    return {
        "channel": channel,
        "attachments": [{
            "color": color,
            "blocks": blocks,
            "fallback": f"promptfoo Basic Eval: {passed}/{total} passed",
        }],
    }


def _slack_post(url: str, token: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", required=True, help="Slack channel ID or name")
    parser.add_argument("--results", required=True, help="promptfoo JSON results file")
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        print("SLACK_BOT_TOKEN not set; skipping Slack notification", file=sys.stderr)
        return 0

    if not os.path.exists(args.results):
        print(f"results file {args.results} missing; skipping", file=sys.stderr)
        return 0

    results = load_results(args.results)
    payload = build_payload(args.channel, os.environ.get("GITHUB_RUN_URL", ""), results)

    # Best-effort auto-join, then post.
    try:
        _slack_post("https://slack.com/api/conversations.join", token,
                    {"channel": args.channel})
    except Exception:
        pass

    resp = _slack_post("https://slack.com/api/chat.postMessage", token, payload)
    if not resp.get("ok"):
        print(f"Slack post failed: {resp.get('error')}", file=sys.stderr)
        return 1
    print(f"Message posted to {args.channel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
