#!/usr/bin/env python3
"""
llm_client.py — Stdlib-only LLM client with multi-provider rotation.

Used by CI scripts (auto_fix_agent.py, bug_report_slack.py) that must run
inside a minimal `pip install`-free environment. For LangChain-based
rotation (Ragas evals etc.) see eval/rotating_llm.py — keep provider list
roughly in sync with this file.

Why duplicate the list? Because eval/rotating_llm.py pulls in langchain_openai
+ pydantic, which is too heavy for the .github/scripts CI agents. This module
deliberately uses only urllib.request so it works with zero extra installs.

API:
    chat(messages, *, system=None, tools=None, max_tokens=2000) -> dict
      returns {"content": str, "tool_calls": [{"name", "input"}], "provider": str}
      tool_calls is empty if no tool was called or tools weren't supported.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

# Order = priority. Same set & order as eval/rotating_llm.py. All endpoints are
# OpenAI-compatible /chat/completions. Tool/function calling is supported by
# all listed providers' models as of 2026-05.
_PROVIDERS = [
    {
        "name": "groq",
        "key_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
    },
    {
        "name": "cerebras",
        "key_env": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1",
        "model": "llama-3.3-70b",
    },
    {
        "name": "sambanova",
        "key_env": "SAMBANOVA_API_KEY",
        "base_url": "https://api.sambanova.ai/v1",
        "model": "Meta-Llama-3.3-70B-Instruct",
    },
    {
        "name": "mistral",
        "key_env": "MISTRAL_API_KEY",
        "base_url": "https://api.mistral.ai/v1",
        "model": "mistral-large-latest",
    },
    {
        "name": "openai",
        "key_env": "OPENAI_API_KEY",
        "base_url_env": "OPENAI_BASE_URL",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    },
    {
        "name": "openrouter-llama",
        "key_env": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "extra_headers": {"HTTP-Referer": "https://alexpavsky.com"},
    },
    {
        "name": "openrouter-deepseek",
        "key_env": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
        "model": "deepseek/deepseek-r1-0528:free",
        "extra_headers": {"HTTP-Referer": "https://alexpavsky.com"},
    },
    {
        "name": "huggingface",
        "key_env": "HF_TOKEN",
        "base_url": "https://router.huggingface.co/v1",
        "model": "meta-llama/Llama-3.3-70B-Instruct:cerebras",
    },
]

# Substrings that mean "skip this provider and try the next one" rather than
# bubble up the error.
_ROTATE_PATTERNS = (
    "rate", "429", "quota", "limit", "credit", "exhaust",
    "402", "401", "403", "insufficient", "out of tokens",
    "tpd", "rpd", "tpm", "forbidden", "unauthorized",
)


def _should_rotate(err_text: str) -> bool:
    low = err_text.lower()
    return any(p in low for p in _ROTATE_PATTERNS)


def _post(url: str, headers: dict, body: bytes, timeout: int) -> dict:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        # Read response body to get the actual error message
        try:
            err_body = e.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            err_body = ""
        raise RuntimeError(f"HTTP {e.code}: {err_body or e.reason}") from e


def _build_payload(model: str, messages: list, system: str | None,
                   tools: list | None, max_tokens: int, temperature: float) -> dict:
    full_msgs: list[dict] = []
    if system:
        full_msgs.append({"role": "system", "content": system})
    full_msgs.extend(messages)
    payload: dict = {
        "model": model,
        "messages": full_msgs,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = [
            {"type": "function", "function": t} for t in tools
        ]
        payload["tool_choice"] = "auto"
    return payload


def _normalize_tool_calls(message: dict) -> list[dict]:
    """Convert OpenAI-format tool_calls to [{"name": str, "input": dict}]."""
    calls = message.get("tool_calls") or []
    out: list[dict] = []
    for c in calls:
        fn = c.get("function") or {}
        name = fn.get("name") or c.get("name", "")
        args_raw = fn.get("arguments") or "{}"
        try:
            args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
        except json.JSONDecodeError:
            args = {}
        if name:
            out.append({"name": name, "input": args})
    return out


def chat(
    messages: list,
    *,
    system: str | None = None,
    tools: list | None = None,
    max_tokens: int = 2000,
    temperature: float = 0.1,
    timeout: int = 45,
    quiet: bool = False,
) -> dict:
    """
    Send a chat request, rotating through all configured providers on failure.

    Returns:
        {
          "content": str,                  # message.content or "" if only tools
          "tool_calls": list[{"name","input"}],
          "provider": str,                 # name of provider that succeeded, "" if none
          "errors": list[str],             # per-provider error strings
        }
    """
    errors: list[str] = []
    for prov in _PROVIDERS:
        key = os.environ.get(prov["key_env"], "").strip()
        if not key:
            continue

        base_url = prov["base_url"]
        # Allow OPENAI_BASE_URL etc. to override
        env_override = prov.get("base_url_env")
        if env_override:
            base_url = os.environ.get(env_override, "").strip() or base_url
        url = f"{base_url.rstrip('/')}/chat/completions"

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        headers.update(prov.get("extra_headers", {}))

        payload = _build_payload(
            prov["model"], messages, system, tools, max_tokens, temperature
        )
        body = json.dumps(payload).encode()

        try:
            resp = _post(url, headers, body, timeout)
        except Exception as e:
            err_text = f"[{prov['name']}/{prov['model']}] {e}"
            errors.append(err_text)
            if not quiet:
                print(f"  {err_text} — trying next", file=sys.stderr)
            if _should_rotate(str(e)):
                continue
            # Non-rotatable error (e.g. 5xx) — still try the next provider
            # because the goal is "get an answer somehow".
            continue

        try:
            msg = resp["choices"][0]["message"]
        except (KeyError, IndexError):
            errors.append(f"[{prov['name']}] malformed response")
            continue

        content = msg.get("content") or ""
        tool_calls = _normalize_tool_calls(msg) if tools else []

        # If tools were requested but model returned no tool_calls AND no
        # usable content, treat as failure and rotate.
        if tools and not tool_calls and not content.strip():
            errors.append(f"[{prov['name']}] empty response")
            continue

        return {
            "content": content,
            "tool_calls": tool_calls,
            "provider": prov["name"],
            "errors": errors,
        }

    return {"content": "", "tool_calls": [], "provider": "", "errors": errors}


def configured_providers() -> list[str]:
    """List names of providers whose API key is set. Useful for diagnostics."""
    return [
        p["name"] for p in _PROVIDERS
        if os.environ.get(p["key_env"], "").strip()
    ]


if __name__ == "__main__":
    # Smoke test: print which providers are configured, then call them.
    print("Configured providers:", configured_providers())
    result = chat(
        [{"role": "user", "content": "Reply with the single word: pong"}],
        max_tokens=10,
    )
    print(f"Provider used: {result['provider']}")
    print(f"Content: {result['content']!r}")
    if not result["provider"]:
        print("All providers failed:")
        for e in result["errors"]:
            print(f"  - {e}")
        sys.exit(1)
