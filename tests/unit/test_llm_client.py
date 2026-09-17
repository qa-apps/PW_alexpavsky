from __future__ import annotations

import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / ".github/scripts/llm_client.py"
SPEC = importlib.util.spec_from_file_location("llm_client_under_test", MODULE_PATH)
assert SPEC and SPEC.loader
LLM = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LLM)


class OpenCodeGoProviderTests(unittest.TestCase):
    @mock.patch.dict(
        os.environ,
        {
            "OPENCODE_API_KEY": "test-key",
            "OPENCODE_SESSION_ID": "test-session",
            "ENABLE_OPENCODE_PROVIDER": "true",
        },
        clear=True,
    )
    @mock.patch.object(LLM, "_post")
    def test_opencode_go_is_first_cloud_provider(self, post):
        post.return_value = {
            "choices": [{"message": {"content": "pong"}}],
        }

        result = LLM.chat(
            [{"role": "user", "content": "ping"}],
            max_tokens=8,
        )

        self.assertEqual(result["provider"], "opencode-go")
        url, headers, body, _timeout = post.call_args.args
        self.assertEqual(url, "https://opencode.ai/zen/go/v1/chat/completions")
        self.assertEqual(headers["Authorization"], "Bearer test-key")
        self.assertEqual(headers["User-Agent"], "PW-alexpavsky-agent-fix/1.0")
        self.assertEqual(headers["x-opencode-session"], "test-session")
        payload = json.loads(body)
        self.assertEqual(payload["model"], "kimi-k2.7-code")
        self.assertEqual(payload["temperature"], 1.0)

    @mock.patch.dict(
        os.environ,
        {
            "OPENCODE_API_KEY": "test-opencode-key",
            "GROQ_API_KEY": "test-groq-key",
            "ENABLE_OPENCODE_PROVIDER": "true",
        },
        clear=True,
    )
    @mock.patch.object(LLM, "_post")
    def test_opencode_auth_failure_rotates_to_existing_provider(self, post):
        post.side_effect = [
            RuntimeError("HTTP 401: No payment method"),
            {"choices": [{"message": {"content": "fallback"}}]},
        ]

        result = LLM.chat(
            [{"role": "user", "content": "ping"}],
            max_tokens=8,
            quiet=True,
        )

        self.assertEqual(result["provider"], "groq")
        self.assertEqual(post.call_count, 2)
        self.assertIn("opencode-go", result["errors"][0])

    @mock.patch.dict(
        os.environ,
        {
            "OPENCODE_API_KEY": "test-opencode-key",
            "GROQ_API_KEY": "test-groq-key",
        },
        clear=True,
    )
    @mock.patch.object(LLM, "_post")
    def test_opencode_is_disabled_without_agent_fix_opt_in(self, post):
        post.return_value = {
            "choices": [{"message": {"content": "fallback"}}],
        }

        result = LLM.chat([{"role": "user", "content": "ping"}], max_tokens=8)

        self.assertEqual(result["provider"], "groq")
        self.assertEqual(post.call_count, 1)
        self.assertNotIn("opencode-go", LLM.configured_providers())


if __name__ == "__main__":
    unittest.main()
