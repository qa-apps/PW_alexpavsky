#!/usr/bin/env python3
"""Post Langfuse/LangWatch observability dashboard status to Slack."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def fetch_json(url: str) -> tuple[str, dict]:
    if not url:
        return "not_configured", {}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PW-alexpavsky-observability/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
        return "ok", json.loads(body)
    except urllib.error.HTTPError as exc:
        return f"http_{exc.code}", {}
    except Exception as exc:  # noqa: BLE001
        return f"error:{type(exc).__name__}", {}


def slack_api(method: str, token: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"https://slack.com/api/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if not data.get("ok"):
        error = data.get("error", "unknown")
        if method == "conversations.join" and error in {
            "already_in_channel",
            "missing_scope",
            "method_not_supported_for_channel_type",
        }:
            return data
        raise RuntimeError(f"Slack API {method} failed: {error}")
    return data


def build_payload(
    *,
    channel: str,
    mode: str,
    dashboard_url: str,
    health_url: str,
    health_status: str,
    health: dict,
    run_url: str,
) -> dict:
    is_langfuse = mode == "langfuse"
    title = "Langfuse Agent Workflow Monitor" if is_langfuse else "LangWatch Voice Agent Monitor"
    surface = "AI chat assistant" if is_langfuse else "AI voice assistant"
    trace_shape = (
        "chat_turn: safety_gate -> supervisor_route -> rag/general -> response_adapter"
        if is_langfuse
        else "voice_turn: stt -> brain -> speech_adapter -> tts"
    )
    configured = bool(dashboard_url)
    health_icon = "OK" if health_status == "ok" else "CHECK"
    color = "#2eb886" if health_status == "ok" and configured else "#e9a820"

    obs = (
        health.get("agent_runtime", {}).get("observability", {})
        if isinstance(health.get("agent_runtime"), dict)
        else health.get("observability", {})
    )
    obs_branch = obs.get("chat" if is_langfuse else "voice", {}) if isinstance(obs, dict) else {}
    backend = obs_branch.get("backend") or ("langfuse" if is_langfuse else "langwatch")
    deep = obs_branch.get("trace_deeplink")
    dashboard_from_health = obs_branch.get("dashboard_url") or ""
    if dashboard_from_health and not dashboard_url:
        dashboard_url = dashboard_from_health

    text = (
        f"*Surface:* {surface}\n"
        f"*Trace shape:* `{trace_shape}`\n"
        f"*Backend:* `{backend}`\n"
        f"*Health:* `{health_icon} {health_status}`\n"
        f"*Trace deep links:* `{bool(deep)}`"
    )
    if not configured and not dashboard_url:
        text += "\n*Action:* configure the dashboard URL secret/variable for a direct UI button."

    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": title, "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
    ]

    actions = []
    if dashboard_url:
        actions.append({
            "type": "button",
            "text": {"type": "plain_text", "text": f"Open {'Langfuse' if is_langfuse else 'LangWatch'} UI", "emoji": True},
            "url": dashboard_url,
            "style": "primary",
        })
    if health_url:
        actions.append({
            "type": "button",
            "text": {"type": "plain_text", "text": "Health", "emoji": True},
            "url": health_url,
        })
    if run_url:
        actions.append({
            "type": "button",
            "text": {"type": "plain_text", "text": "View run", "emoji": True},
            "url": run_url,
        })
    if actions:
        blocks.append({"type": "actions", "elements": actions})

    return {
        "channel": channel,
        "attachments": [{
            "color": color,
            "blocks": blocks,
            "fallback": f"{title}: health={health_status}",
        }],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["langfuse", "langwatch"], required=True)
    parser.add_argument("--channel", required=True)
    parser.add_argument("--dashboard-url", default="")
    parser.add_argument("--health-url", default="")
    args = parser.parse_args()

    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        print("SLACK_BOT_TOKEN not set; skipping Slack notification", file=sys.stderr)
        return 0

    health_status, health = fetch_json(args.health_url)
    payload = build_payload(
        channel=args.channel,
        mode=args.mode,
        dashboard_url=args.dashboard_url,
        health_url=args.health_url,
        health_status=health_status,
        health=health,
        run_url=os.environ.get("GITHUB_RUN_URL", ""),
    )

    try:
        slack_api("conversations.join", token, {"channel": args.channel})
    except Exception:
        pass
    slack_api("chat.postMessage", token, payload)
    print(f"Posted {args.mode} observability message to {args.channel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
