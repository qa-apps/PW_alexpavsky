#!/usr/bin/env python3
"""Post the latest hosted I-Copilot multimodal eval as a Slack thread."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import mimetypes
import os
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "PW-alexpavsky-ico-pilot-eval/1.0", "Cache-Control": "no-cache"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def slack(token: str, method: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"https://slack.com/api/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def clip(value: object, limit: int) -> str:
    text = str(value or "").strip()
    return text if len(text) <= limit else text[: limit - 16].rstrip() + "\n...truncated..."


def upload_image(token: str, channel: str, thread_ts: str, url: str, title: str, comment: str) -> bool:
    body = fetch(url)
    filename = Path(urlparse(url).path).name or "i-copilot-case.png"
    prepared = slack(token, "files.getUploadURLExternal", {"filename": filename, "length": len(body)})
    if not prepared.get("ok"):
        print(f"Slack upload preparation failed: {prepared.get('error')}", file=sys.stderr)
        return False
    upload = urllib.request.Request(
        prepared["upload_url"],
        data=body,
        headers={"Content-Type": mimetypes.guess_type(filename)[0] or "application/octet-stream"},
        method="POST",
    )
    with urllib.request.urlopen(upload, timeout=60):
        pass
    completed = slack(token, "files.completeUploadExternal", {
        "files": [{"id": prepared["file_id"], "title": title}],
        "channel_id": channel,
        "thread_ts": thread_ts,
        "initial_comment": comment,
    })
    if not completed.get("ok"):
        print(f"Slack upload completion failed: {completed.get('error')}", file=sys.stderr)
        return False
    return True


def case_text(item: dict) -> str:
    judge = item.get("judge") or {}
    verdict = "PASS" if judge.get("passed") else "FAIL"
    return (
        f"*{verdict} - {clip(item.get('title'), 120)}*\n"
        f"*Spoken prompt:* `{clip(item.get('spoken'), 320)}`\n"
        f"*Conversation context:* {clip(item.get('conversation'), 600)}\n"
        f"*Model:* `{clip(item.get('provider'), 80)}/{clip(item.get('model'), 120)}` · "
        f"TTFT `{item.get('first_token_ms')} ms` · total `{item.get('total_ms')} ms` · "
        f"cost `${float(item.get('estimated_cost_usd') or 0):.6f}`\n"
        f"*I-Copilot answer:*\n```{clip(item.get('answer'), 1500)}```\n"
        f"*GPT-OSS judge:* score `{float(judge.get('score') or 0):.2f}` · "
        f"{clip(judge.get('reason'), 700)}"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", required=True)
    parser.add_argument(
        "--url",
        default="https://159.195.207.48.sslip.io/static/eval-reports/ico-pilot-multimodal-latest.json",
    )
    args = parser.parse_args()
    token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    if not token:
        raise SystemExit("SLACK_BOT_TOKEN is required")

    data = json.loads(fetch(args.url).decode("utf-8"))
    summary = data.get("summary") or {}
    results = data.get("results") or []
    if len(results) != 3 or int(summary.get("total") or 0) != 3:
        raise SystemExit("I-Copilot multimodal report is incomplete")
    run_time = dt.datetime.strptime(str(summary.get("run_id")), "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
    age_hours = (dt.datetime.now(dt.timezone.utc) - run_time).total_seconds() / 3600
    if age_hours > 30:
        raise SystemExit(f"I-Copilot multimodal report is stale ({age_hours:.1f} h)")

    try:
        slack(token, "conversations.join", {"channel": args.channel})
    except Exception:
        pass
    passed = int(summary.get("passed") or 0)
    parent = slack(token, "chat.postMessage", {
        "channel": args.channel,
        "text": (
            f"{'✅' if passed == 3 else '🔴'} *I-Copilot nightly screen + speech eval: {passed}/3 passed*\n"
            f"Answers use the configured paid production model ladder. Judge: local `{summary.get('judge_model')}` on Bosgame.\n"
            f"Estimated model cost: `${float(summary.get('estimated_cost_usd') or 0):.6f}`. "
            "Each reply below includes the screenshot, spoken prompt, model answer, latency, and judge explanation."
        ),
    })
    if not parent.get("ok") or not parent.get("ts"):
        raise SystemExit(f"Slack parent message failed: {parent.get('error')}")

    delivered = True
    for item in results:
        comment = case_text(item)
        image_url = str(item.get("image_url") or "")
        case_delivered = bool(image_url) and upload_image(
            token, args.channel, parent["ts"], image_url,
            f"I-Copilot - {item.get('title')}", comment,
        )
        if not case_delivered:
            fallback = slack(token, "chat.postMessage", {
                "channel": args.channel,
                "thread_ts": parent["ts"],
                "text": f"{comment}\n*Screenshot:* {image_url or 'missing'}",
            })
            case_delivered = bool(fallback.get("ok"))
        delivered = delivered and case_delivered
    return 0 if delivered else 1


if __name__ == "__main__":
    raise SystemExit(main())
