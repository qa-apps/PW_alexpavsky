from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _load_module():
    path = ROOT / ".github/scripts/notify_icopilot_multimodal_slack.py"
    spec = importlib.util.spec_from_file_location("notify_icopilot_multimodal_slack", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def test_case_message_documents_prompt_answer_model_and_judge():
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
        "judge": {"passed": True, "score": 1, "reason": "Used screen and speech."},
    })

    for expected in ("Spoken prompt", "Conversation context", "gemini/gemini-test", "I-Copilot answer", "GPT-OSS judge"):
        assert expected in text


def test_workflow_is_dst_safe_and_does_not_require_the_macbook():
    workflow = (ROOT / ".github/workflows/ico-pilot-multimodal.yml").read_text(encoding="utf-8")
    assert "0 13 * * *|EDT" in workflow
    assert "0 14 * * *|EST" in workflow
    assert "runs-on: ubuntu-latest" in workflow
