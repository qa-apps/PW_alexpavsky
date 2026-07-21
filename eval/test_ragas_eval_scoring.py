import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from eval.ragas_eval import is_refusal_answer, record_passed, write_report


class RefusalScoringTests(unittest.TestCase):
    def test_accepts_current_rag_absence_wording(self) -> None:
        answers = (
            "The context does not provide specific numerical values for the flake rate.",
            "The provided context does not mention any incident on March 15, 2025.",
            "The provided context does not contain any information about that event.",
        )
        for answer in answers:
            with self.subTest(answer=answer):
                self.assertTrue(is_refusal_answer(answer))

    def test_does_not_treat_a_supported_answer_as_refusal(self) -> None:
        self.assertFalse(is_refusal_answer("The flake rate fell from 48% to 2.7%."))

    def test_accepted_refusal_uses_final_gate_even_when_keywords_miss(self) -> None:
        record = {
            "category": "incidents",
            "accept_refusal": True,
            "answer": "The provided context does not mention that incident.",
            "keyword_passed": False,
            "faithfulness": 0.25,
            "relevancy": 0.0,
        }
        self.assertTrue(record_passed(record))

    def test_standard_answer_still_requires_judge_support(self) -> None:
        record = {
            "category": "agents",
            "accept_refusal": False,
            "answer": "Agent 3 validates RAG faithfulness.",
            "keyword_passed": True,
            "faithfulness": 0.38,
            "relevancy": 0.38,
        }
        self.assertFalse(record_passed(record))

    def test_report_renders_final_gate_not_intermediate_keyword_status(self) -> None:
        records = [
            {
                "id": "case-6",
                "category": "metrics",
                "accept_refusal": True,
                "answer": "The context does not provide those values.",
                "keyword_passed": False,
                "faithfulness": 1.0,
                "relevancy": 0.0,
            },
            {
                "id": "case-14",
                "category": "agents",
                "accept_refusal": False,
                "answer": "Agent 3 validates RAG faithfulness.",
                "keyword_passed": True,
                "faithfulness": 0.38,
                "relevancy": 0.38,
            },
        ]
        for record in records:
            record["final_passed"] = record_passed(record)
        summary = {
            "avg_faithfulness": 0.69,
            "avg_relevancy": 0.19,
            "keyword_pass_rate": 0.5,
            "total": 2,
            "judge_model": "test",
        }
        with TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "report.md"
            with patch("eval.ragas_eval.RESULTS_DIR", Path(temp_dir)), patch(
                "eval.ragas_eval.OUTPUT_PATH", output
            ):
                write_report(records, summary)
            report = output.read_text(encoding="utf-8")
        self.assertIn("| case-6 | metrics | 1.00 | 0.00 | PASS (refusal) |", report)
        self.assertIn("| case-14 | agents | 0.38 | 0.38 | FAIL |", report)


if __name__ == "__main__":
    unittest.main()
