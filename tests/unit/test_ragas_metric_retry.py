import math
import sys
import unittest
from unittest.mock import MagicMock

sys.modules.setdefault("requests", MagicMock())
from eval.ragas_eval import merge_metric_rows, samples_missing_metrics


class RagasMetricRetryTests(unittest.TestCase):
    def test_retry_merges_only_valid_missing_metrics(self):
        records = [
            {"faithfulness": math.nan, "relevancy": math.nan},
            {"faithfulness": math.nan, "relevancy": math.nan},
        ]
        samples = [{"_idx": 0}, {"_idx": 1}]

        merge_metric_rows(records, samples, [
            {"faithfulness": 1.0, "answer_relevancy": 0.9},
            {"faithfulness": None, "answer_relevancy": 0.8},
        ])

        self.assertEqual(samples_missing_metrics(records, samples), [samples[1]])
        merge_metric_rows(records, [samples[1]], [
            {"faithfulness": 0.7, "answer_relevancy": None},
        ])

        self.assertEqual(samples_missing_metrics(records, samples), [])
        self.assertEqual(records[1], {"faithfulness": 0.7, "relevancy": 0.8})

    def test_invalid_retry_values_remain_missing(self):
        records = [{"faithfulness": math.nan, "relevancy": math.nan}]
        samples = [{"_idx": 0}]

        merge_metric_rows(records, samples, [
            {"faithfulness": "invalid", "answer_relevancy": None},
        ])

        self.assertEqual(samples_missing_metrics(records, samples), samples)


if __name__ == "__main__":
    unittest.main()
