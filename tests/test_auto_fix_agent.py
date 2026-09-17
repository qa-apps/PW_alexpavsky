import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_DIR = Path(__file__).parents[1] / ".github" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))
SPEC = importlib.util.spec_from_file_location(
    "auto_fix_agent", SCRIPT_DIR / "auto_fix_agent.py")
agent = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(agent)


class AutoFixSafetyTests(unittest.TestCase):
    def test_safe_path_allowlist(self):
        self.assertTrue(agent.is_safe_autofix_path("tests/carousel.spec.ts"))
        self.assertTrue(agent.is_safe_autofix_path("performance/site.js"))
        self.assertTrue(agent.is_safe_autofix_path(".github/scripts/report.py"))
        self.assertTrue(agent.is_safe_autofix_path("./tests/carousel.spec.ts"))

        self.assertFalse(agent.is_safe_autofix_path("tests/security-daily.spec.ts"))
        self.assertFalse(agent.is_safe_autofix_path(".github/workflows/ci.yml"))
        self.assertFalse(agent.is_safe_autofix_path("package-lock.json"))
        self.assertFalse(agent.is_safe_autofix_path("../tests/example.spec.ts"))

    def test_json_parser_accepts_fenced_object(self):
        value = agent.parse_json_object(
            '```json\n{"verdict":"APPROVE","confidence":0.9}\n```')
        self.assertEqual(value["verdict"], "APPROVE")

    def test_targeted_playwright_command_uses_only_named_specs(self):
        with patch.object(agent, "PIPELINE", "Playwright CI (deterministic tests)"):
            commands = agent.targeted_commands(
                ["tests/carousel.spec.ts", "scripts/helper.py"], "")
        self.assertEqual(
            commands,
            [["npx", "playwright", "test", "tests/carousel.spec.ts", "--workers=1"]],
        )

    def test_targeted_python_playwright_command_uses_pytest(self):
        with patch.object(agent, "PIPELINE", "Playwright CI"):
            commands = agent.targeted_commands(
                ["tests/test_navigation.py", "scripts/helper.py"], "")
        self.assertEqual(
            commands,
            [[sys.executable, "-m", "pytest", "tests/test_navigation.py", "--tb=short"]],
        )

    def test_ambiguous_performance_failure_has_no_command(self):
        with patch.object(agent, "PIPELINE", "k6 Performance"):
            commands = agent.targeted_commands([], "smoke failed and rps-100 failed")
        self.assertEqual(commands, [])

    def test_cloud_review_fails_closed_on_provider_error(self):
        failed = {
            "content": "", "model": "gpt-5.1", "usage": {},
            "errors": ["HTTP 401"],
        }
        with patch.object(agent.llm_client, "chat_provider", return_value=failed):
            review = agent.cloud_review(
                "openai", "gpt-5.1", "diff", {"passed": True},
                {"approved": True}, "failure log")
        self.assertFalse(review["approved"])

    def test_cloud_review_requires_explicit_high_confidence_approval(self):
        response = {
            "content": json.dumps({
                "verdict": "APPROVE", "confidence": 0.75,
                "reason": "looks fine", "risks": [],
            }),
            "model": "gpt-5.1", "usage": {}, "errors": [],
        }
        with patch.object(agent.llm_client, "chat_provider", return_value=response):
            review = agent.cloud_review(
                "openai", "gpt-5.1", "diff", {"passed": True},
                {"approved": True}, "failure log")
        self.assertFalse(review["approved"])

    def test_anthropic_provider_uses_messages_api_and_effort(self):
        captured = {}

        def fake_post(url, headers, body, timeout):
            captured.update({
                "url": url,
                "headers": headers,
                "payload": json.loads(body),
                "timeout": timeout,
            })
            return {
                "content": [{"type": "text", "text": '{"verdict":"APPROVE"}'}],
                "usage": {"input_tokens": 12, "output_tokens": 4},
            }

        with (
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch.object(agent.llm_client, "_post", side_effect=fake_post),
        ):
            result = agent.llm_client.chat_provider(
                "anthropic",
                [{"role": "user", "content": "Review"}],
                system="Return JSON",
                model="claude-sonnet-5",
                max_tokens=4000,
                reasoning_effort="high",
                json_response=True,
            )

        self.assertEqual(result["content"], '{"verdict":"APPROVE"}')
        self.assertEqual(captured["url"], "https://api.anthropic.com/v1/messages")
        self.assertEqual(captured["payload"]["output_config"], {"effort": "high"})
        self.assertNotIn("temperature", captured["payload"])


if __name__ == "__main__":
    unittest.main()
