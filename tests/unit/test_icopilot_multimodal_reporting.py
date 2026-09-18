from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]


def _load_module():
    path = ROOT / ".github/scripts/notify_icopilot_multimodal_slack.py"
    spec = importlib.util.spec_from_file_location("notify_icopilot_multimodal_slack", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


class ICopilotMultimodalReportingTests(unittest.TestCase):
    def test_upload_url_request_uses_slack_form_encoding(self):
        notify = _load_module()

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"ok": true}'

        requests = []

        def open_request(request, timeout):
            requests.append((request, timeout))
            return Response()

        with mock.patch.object(notify.urllib.request, "urlopen", side_effect=open_request):
            result = notify.slack_form(
                "test-token",
                "files.getUploadURLExternal",
                {"filename": "case one.png", "length": 123},
            )

        self.assertTrue(result["ok"])
        request, timeout = requests[0]
        self.assertEqual(timeout, 30)
        self.assertEqual(
            request.get_header("Content-type"),
            "application/x-www-form-urlencoded",
        )
        self.assertEqual(request.data, b"filename=case+one.png&length=123")

    def test_case_message_documents_prompt_answer_model_and_judge(self):
        notify = _load_module()
        text = notify.case_text({
            "title": "Confusing context",
            "spoken": "What would you do here?",
            "conversation": "The screen contains a code task.",
            "provider": "gemini",
            "model": "gemini-test",
            "answer": "Fix the assignment operator.",
            "first_token_ms": 120,
            "total_ms": 450,
            "estimated_cost_usd": 0.001,
            "judge": {
                "provider": "deepseek",
                "model": "deepseek-chat",
                "passed": True,
                "score": 1,
                "reason": "Used screen and speech.",
            },
        })

        for expected in (
            "Spoken prompt",
            "Conversation context",
            "gemini/gemini-test",
            "I-Copilot answer",
            "LLM judge",
            "deepseek/deepseek-chat",
        ):
            self.assertIn(expected, text)

    def test_case_blocks_render_the_screenshot_and_full_evidence(self):
        notify = _load_module()
        blocks = notify.case_blocks({
            "title": "Confusing context",
            "spoken": "What would you do here?",
            "conversation": "The screen contains a code task.",
            "provider": "gemini",
            "model": "gemini-test",
            "answer": "Fix the assignment operator.",
            "first_token_ms": 120,
            "total_ms": 450,
            "estimated_cost_usd": 0.001,
            "judge": {
                "provider": "deepseek",
                "model": "deepseek-chat",
                "passed": True,
                "score": 1,
                "reason": "Used screen and speech.",
            },
        }, "https://example.test/case.png")

        self.assertEqual(blocks[1]["type"], "image")
        self.assertEqual(blocks[1]["image_url"], "https://example.test/case.png")
        rendered = str(blocks)
        for expected in ("Spoken prompt", "I-Copilot answer", "LLM judge"):
            self.assertIn(expected, rendered)

    def test_workflow_is_dst_safe_and_does_not_require_the_macbook(self):
        workflow = (ROOT / ".github/workflows/ico-pilot-multimodal.yml").read_text(encoding="utf-8")
        self.assertIn("0 13 * * *|EDT", workflow)
        self.assertIn("0 14 * * *|EST", workflow)
        self.assertIn("runs-on: ubuntu-latest", workflow)

    def test_failed_case_makes_the_report_workflow_fail_after_delivery(self):
        script = (ROOT / ".github/scripts/notify_icopilot_multimodal_slack.py").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/auto-fix.yml").read_text(encoding="utf-8")

        self.assertIn("delivered and passed == len(results)", script)
        self.assertIn("delivered = delivered and case_delivered", script)
        self.assertIn('"I-Copilot Multimodal Report"', workflow)
