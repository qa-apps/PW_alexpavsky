#!/usr/bin/env python3
"""
Slack CI notification with emoji donut chart.
Usage: python notify_slack.py --channel CHANNEL_ID --pipeline PIPELINE_NAME [--results-dir DIR]
"""
import argparse
import glob
import json
import os
import sys
import urllib.request
import urllib.error


def load_results(results_dir: str) -> dict:
    """Parse Playwright JSON results. Falls back to zeros if none found."""
    passed = failed = flaky = skipped = 0

    json_files = glob.glob(os.path.join(results_dir, "*.json"))
    # Also check for the aggregated results file produced by --reporter=json
    for path in json_files:
        try:
            with open(path) as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        # Playwright JSON reporter top-level stats
        stats = data.get("stats", {})
        if stats:
            passed  += stats.get("expected", 0)
            failed  += stats.get("unexpected", 0)
            flaky   += stats.get("flaky", 0)
            skipped += stats.get("skipped", 0)
            continue

        # Also handle array of suites (some CI setups dump per-file JSON)
        suites = data.get("suites", [])
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    status = test.get("status", "")
                    if status == "expected":
                        passed += 1
                    elif status == "unexpected":
                        failed += 1
                    elif status == "flaky":
                        flaky += 1
                    elif status == "skipped":
                        skipped += 1

    return {"passed": passed, "failed": failed, "flaky": flaky, "skipped": skipped}


def build_donut(passed: int, failed: int, flaky: int, skipped: int, width: int = 20) -> str:
    """Build an emoji donut bar proportional to counts."""
    total = passed + failed + flaky + skipped
    if total == 0:
        return "⚪" * width + " (no results)"

    n_pass  = round(passed  / total * width)
    n_fail  = round(failed  / total * width)
    n_flaky = round(flaky   / total * width)
    n_skip  = width - n_pass - n_fail - n_flaky
    n_skip  = max(0, n_skip)

    return "🟢" * n_pass + "🔴" * n_fail + "🟠" * n_flaky + "⚪" * n_skip


def build_payload(channel: str, pipeline: str, run_url: str,
                  passed: int, failed: int, flaky: int, skipped: int) -> dict:
    total = passed + failed + flaky + skipped

    if failed > 0:
        color = "#cc2929"   # red
        status_emoji = "🔴"
        status_text = "FAILED"
    elif flaky > 0:
        color = "#e9a820"   # orange
        status_emoji = "🟠"
        status_text = "FLAKY"
    else:
        color = "#2eb886"   # green
        status_emoji = "✅"
        status_text = "PASSED"

    donut = build_donut(passed, failed, flaky, skipped)
    pct = f"{round(passed / total * 100)}%" if total else "—"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{status_emoji}  {pipeline}  —  {status_text}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": donut
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*✅ Passed*\n{passed}"},
                {"type": "mrkdwn", "text": f"*🔴 Failed*\n{failed}"},
                {"type": "mrkdwn", "text": f"*🟠 Flaky*\n{flaky}"},
                {"type": "mrkdwn", "text": f"*⏭️ Skipped*\n{skipped}"},
                {"type": "mrkdwn", "text": f"*📊 Total*\n{total}"},
                {"type": "mrkdwn", "text": f"*📈 Pass rate*\n{pct}"},
            ]
        },
    ]

    if run_url:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "🔗 View run", "emoji": True},
                    "url": run_url,
                    "style": "primary" if failed == 0 else "danger"
                }
            ]
        })

    return {
        "channel": channel,
        "attachments": [
            {
                "color": color,
                "blocks": blocks,
                "fallback": f"{pipeline}: {passed} passed, {failed} failed, {flaky} flaky, {skipped} skipped"
            }
        ]
    }


def post_message(token: str, payload: dict) -> None:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            if not result.get("ok"):
                print(f"Slack error: {result.get('error')}", file=sys.stderr)
                sys.exit(1)
            print(f"Message posted to {payload['channel']}")
    except urllib.error.URLError as e:
        print(f"HTTP error: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Post CI results to Slack")
    parser.add_argument("--channel",  required=True, help="Slack channel ID or name")
    parser.add_argument("--pipeline", required=True, help="Pipeline display name")
    parser.add_argument("--results-dir", default="test-results", help="Dir with Playwright JSON results")
    parser.add_argument("--passed",  type=int, default=None, help="Override passed count")
    parser.add_argument("--failed",  type=int, default=None, help="Override failed count")
    parser.add_argument("--flaky",   type=int, default=None, help="Override flaky count")
    parser.add_argument("--skipped", type=int, default=None, help="Override skipped count")
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        print("SLACK_BOT_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    run_url = os.environ.get("GITHUB_RUN_URL", "")
    if not run_url:
        repo = os.environ.get("GITHUB_REPOSITORY", "")
        run_id = os.environ.get("GITHUB_RUN_ID", "")
        if repo and run_id:
            run_url = f"https://github.com/{repo}/actions/runs/{run_id}"

    if args.passed is not None:
        stats = {
            "passed": args.passed,
            "failed": args.failed or 0,
            "flaky":  args.flaky  or 0,
            "skipped": args.skipped or 0,
        }
    else:
        stats = load_results(args.results_dir)

    payload = build_payload(
        channel=args.channel,
        pipeline=args.pipeline,
        run_url=run_url,
        **stats
    )
    post_message(token, payload)


if __name__ == "__main__":
    main()
