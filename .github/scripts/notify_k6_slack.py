#!/usr/bin/env python3
"""
Post k6 performance summaries to Slack.

Usage:
  python .github/scripts/notify_k6_slack.py --channel CHANNEL_ID --results-dir performance-results
"""
import argparse
import glob
import json
import os
import sys
import urllib.error
import urllib.request


PROFILE_LIMITS = {
    "smoke": {"fail_rate": 0.01, "checks_rate": 0.99, "p95": 1500},
    "load": {"fail_rate": 0.01, "checks_rate": 0.99, "p95": 2500},
    "stress": {"fail_rate": 0.05, "checks_rate": 0.95, "p95": 5000},
    "spike": {"fail_rate": 0.05, "checks_rate": 0.95, "p95": 6000},
    "spike-slow": {"fail_rate": 0.05, "checks_rate": 0.95, "p95": 5000},
    "spike-instant": {"fail_rate": 0.05, "checks_rate": 0.95, "p95": 6000},
    "rps-100": {"fail_rate": 0.01, "checks_rate": 0.99, "p95": 2500, "dropped": 1},
    "chatbot-minimal": {"fail_rate": 0.20, "checks_rate": 0.80, "p95": 30000, "chatbot_ok": 0.80},
}


def metric_value(metrics: dict, name: str, value: str, default=0):
    metric = metrics.get(name, {})
    if "values" in metric:
        return metric.get("values", {}).get(value, default)
    if value == "rate" and "value" in metric:
        return metric.get("value", default)
    return metric.get(value, default)


def profile_passed(
    profile: str,
    metrics: dict,
    checks_rate: float,
    fail_rate: float,
    p95: float,
    dropped: float,
) -> bool:
    limits = PROFILE_LIMITS.get(profile, PROFILE_LIMITS["smoke"])
    if fail_rate >= limits["fail_rate"]:
        return False
    if checks_rate <= limits["checks_rate"]:
        return False
    if p95 >= limits["p95"]:
        return False
    if "dropped" in limits and dropped >= limits["dropped"]:
        return False
    if "chatbot_ok" in limits:
        chatbot_ok = metric_value(metrics, "chatbot_ok", "rate", 0) or 0
        if chatbot_ok <= limits["chatbot_ok"]:
            return False
    return True


def load_result(path: str) -> dict:
    with open(path) as f:
        data = json.load(f)

    metrics = data.get("metrics", {})
    profile = os.path.basename(path).replace(".json", "").replace("k6-", "")
    checks_rate = metric_value(metrics, "checks", "rate", 0) or 0
    fail_rate = metric_value(metrics, "http_req_failed", "rate", 0) or 0
    p95 = metric_value(metrics, "http_req_duration", "p(95)", 0) or 0
    p99 = metric_value(metrics, "http_req_duration", "p(99)", 0) or 0
    avg = metric_value(metrics, "http_req_duration", "avg", 0) or 0
    reqs = metric_value(metrics, "http_reqs", "count", 0) or 0
    rps = metric_value(metrics, "http_reqs", "rate", 0) or 0
    iterations = metric_value(metrics, "iterations", "count", 0) or 0
    dropped = metric_value(metrics, "dropped_iterations", "count", 0) or 0

    passed = profile_passed(profile, metrics, checks_rate, fail_rate, p95, dropped)

    return {
        "profile": profile,
        "passed": passed,
        "checks_rate": checks_rate,
        "fail_rate": fail_rate,
        "p95": p95,
        "p99": p99,
        "avg": avg,
        "reqs": reqs,
        "rps": rps,
        "iterations": iterations,
        "dropped": dropped,
    }


def load_results(results_dir: str) -> list[dict]:
    files = sorted(glob.glob(os.path.join(results_dir, "k6-*.json")))
    results = []
    for path in files:
        try:
            results.append(load_result(path))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"Skipping invalid k6 summary {path}: {exc}", file=sys.stderr)
    return results


def build_donut(passed: int, failed: int, width: int = 20) -> str:
    total = passed + failed
    if total == 0:
        return "⚪" * width + " (no k6 results)"
    green = round(passed / total * width)
    red = width - green
    return "🟢" * green + "🔴" * red


def fmt_ms(value: float) -> str:
    return f"{value:.0f} ms"


def fmt_pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def build_payload(channel: str, pipeline: str, run_url: str, results: list[dict]) -> dict:
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = passed + failed

    if failed:
        color = "#cc2929"
        status_icon = "🔴"
        status_text = "FAILED"
    elif total:
        color = "#2eb886"
        status_icon = "✅"
        status_text = "PASSED"
    else:
        color = "#e9a820"
        status_icon = "🟠"
        status_text = "NO RESULTS"

    max_p95 = max((r["p95"] for r in results), default=0)
    max_rps = max((r["rps"] for r in results), default=0)
    total_reqs = sum(r["reqs"] for r in results)
    worst_fail = max((r["fail_rate"] for r in results), default=0)
    donut = build_donut(passed, failed)

    detail_lines = []
    for r in results[:8]:
        mark = "✅" if r["passed"] else "🔴"
        detail_lines.append(
            f"{mark} *{r['profile']}* | p95 {fmt_ms(r['p95'])} | "
            f"fail {fmt_pct(r['fail_rate'])} | {r['rps']:.1f} rps | "
            f"{int(r['reqs'])} req | dropped {int(r['dropped'])}"
        )
    if len(results) > 8:
        detail_lines.append(f"...and {len(results) - 8} more profiles")

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{status_icon}  {pipeline}  —  {status_text}",
                "emoji": True,
            },
        },
        {"type": "section", "text": {"type": "mrkdwn", "text": donut}},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*✅ Passed profiles*\n{passed}"},
                {"type": "mrkdwn", "text": f"*🔴 Failed profiles*\n{failed}"},
                {"type": "mrkdwn", "text": f"*📊 Total requests*\n{int(total_reqs)}"},
                {"type": "mrkdwn", "text": f"*📈 Max observed RPS*\n{max_rps:.1f}"},
                {"type": "mrkdwn", "text": f"*⏱️ Worst p95*\n{fmt_ms(max_p95)}"},
                {"type": "mrkdwn", "text": f"*⚠️ Worst fail rate*\n{fmt_pct(worst_fail)}"},
            ],
        },
    ]

    if detail_lines:
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(detail_lines)}})

    if run_url:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "🔗 View run", "emoji": True},
                    "url": run_url,
                    "style": "primary" if failed == 0 else "danger",
                }
            ],
        })

    return {
        "channel": channel,
        "attachments": [{
            "color": color,
            "blocks": blocks,
            "fallback": f"{pipeline}: {passed}/{total} k6 profiles passed",
        }],
    }


def join_channel(token: str, channel: str) -> None:
    body = json.dumps({"channel": channel}).encode()
    req = urllib.request.Request(
        "https://slack.com/api/conversations.join",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            err = result.get("error")
            if not result.get("ok") and err not in {
                "already_in_channel",
                "missing_scope",
                "method_not_supported_for_channel_type",
            }:
                print(f"conversations.join warning: {err}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"conversations.join HTTP error: {exc}", file=sys.stderr)


def post_message(token: str, payload: dict) -> None:
    channel = payload["channel"]
    join_channel(token, channel)
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            if result.get("ok"):
                print(f"Message posted to {channel}")
                return
            print(f"Slack delivery failed: {result.get('error', 'unknown')}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"Slack HTTP error: {exc}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Post k6 results to Slack")
    parser.add_argument("--channel", required=True, help="Slack channel ID or name")
    parser.add_argument("--pipeline", default="k6 Performance", help="Pipeline display name")
    parser.add_argument("--results-dir", default="performance-results", help="Dir with k6 summary JSON")
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        print("SLACK_BOT_TOKEN not set; skipping Slack notification", file=sys.stderr)
        return

    run_url = os.environ.get("GITHUB_RUN_URL", "")
    if not run_url:
        repo = os.environ.get("GITHUB_REPOSITORY", "")
        run_id = os.environ.get("GITHUB_RUN_ID", "")
        if repo and run_id:
            run_url = f"https://github.com/{repo}/actions/runs/{run_id}"

    results = load_results(args.results_dir)
    payload = build_payload(args.channel, args.pipeline, run_url, results)
    post_message(token, payload)


if __name__ == "__main__":
    main()
