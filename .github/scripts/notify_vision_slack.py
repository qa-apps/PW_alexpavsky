#!/usr/bin/env python3
"""Publish an Agentic Vision Audit report and selected media to Slack."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.request
from pathlib import Path

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def slack_post(token: str, method: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"https://slack.com/api/{method}",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read())


def upload_file(token: str, channel: str, file_path: str, title: str) -> str:
    path = Path(file_path)
    if not path.is_file() or path.stat().st_size > MAX_UPLOAD_BYTES:
        return ""
    prepared = slack_post(token, "files.getUploadURLExternal", {
        "filename": path.name,
        "length": path.stat().st_size,
    })
    if not prepared.get("ok"):
        print(f"Slack upload preparation failed: {prepared.get('error')}", file=sys.stderr)
        return ""
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    upload = urllib.request.Request(
        prepared["upload_url"], data=path.read_bytes(),
        headers={"Content-Type": content_type}, method="POST",
    )
    with urllib.request.urlopen(upload, timeout=60):
        pass
    completed = slack_post(token, "files.completeUploadExternal", {
        "files": [{"id": prepared["file_id"], "title": title}],
        "channel_id": channel,
    })
    if not completed.get("ok"):
        print(f"Slack upload completion failed: {completed.get('error')}", file=sys.stderr)
        return ""
    files = completed.get("files") or []
    return files[0].get("permalink", "") if files else ""


def selected_steps(steps: list[dict]) -> list[dict]:
    if len(steps) <= 3:
        return steps
    indexes = sorted({0, len(steps) // 2, len(steps) - 1})
    return [steps[index] for index in indexes]


def finding_lines(report: dict) -> list[str]:
    findings = list(report.get("deterministic_findings") or [])
    findings.extend(report.get("confirmed_findings") or [])
    if not findings:
        return ["No confirmed visual or functional defects."]
    lines = []
    for finding in findings[:8]:
        title = str(finding.get("title") or "Issue")[:160]
        evidence = str(finding.get("evidence") or "")[:260]
        severity = str(finding.get("severity") or "unknown").upper()
        lines.append(f"- [{severity}] {title}: {evidence}")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    parser.add_argument("--channel", required=True)
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    if not token:
        print("SLACK_BOT_TOKEN is not configured; skipping Slack notification.")
        return

    report = json.loads(Path(args.report).read_text())
    status = report.get("status", "failed")
    marker = ":white_check_mark:" if status == "passed" else ":x:"
    steps = report.get("steps") or []
    media_links = []
    for step in selected_steps(steps):
        link = upload_file(
            token, args.channel, step.get("screenshot", ""),
            f"Vision audit step {step.get('step')}: {step.get('title') or step.get('url')}",
        )
        if link:
            media_links.append(f"<{link}|step {step.get('step')} screenshot>")

    video = report.get("video") or ""
    video_link = upload_file(token, args.channel, video, "Agentic Vision Audit recording")
    if video_link:
        media_links.append(f"<{video_link}|session video>")

    run_url = os.environ.get("GITHUB_RUN_URL", "")
    usage = report.get("model_usage") or {}
    run_link = f"<{run_url}|Open GitHub run>" if run_url else ""
    text = (
        f"{marker} *Daily Agentic Vision Audit - {status.upper()}*\n"
        f"*Model:* `{report.get('model', 'unknown')}`\n"
        f"*Coverage:* {len(steps)} agent steps, "
        f"{len(report.get('pages_observed') or [])} unique URLs\n"
        f"*Vision usage:* {usage.get('calls', 0)} local calls, "
        f"{usage.get('prompt_tokens', 0)} input tokens, "
        f"{usage.get('completion_tokens', 0)} output tokens\n"
        f"*Findings:*\n" + "\n".join(finding_lines(report)) + "\n"
        f"*Media:* {' | '.join(media_links) if media_links else 'available in GitHub artifacts'}\n"
        f"{run_link}"
    )
    result = slack_post(token, "chat.postMessage", {"channel": args.channel, "text": text})
    if not result.get("ok"):
        print(f"Slack message failed: {result.get('error')}", file=sys.stderr)


if __name__ == "__main__":
    main()
