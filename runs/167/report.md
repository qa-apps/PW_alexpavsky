# Ragas Evaluation Report

_Generated: 2026-09-13T06:32:02.857176+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 1.000 | ≥ 0.50 | PASS |
| Average answer_relevancy | 0.831 | ≥ 0.35 | PASS |
| Keyword check pass rate | 90.0% | ≥ 60% | PASS |
| Questions evaluated     | 10 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.99 | PASS | FinNova Bank deployed **seven** specialized AI agents.... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.79 | PASS | Production P1/P2 bugs per month dropped from 18.4 to 6.1, which is a 67% reduction.... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved $2.4M annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 0.62 | PASS | Before: 4 hours 30 minutes   After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 1.00 | PASS | The Test Generator agent produced 3,247 automated test cases.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context provided does not contain any information about the flake rate before or after any engag... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 0.99 | PASS | FinNova Bank handles approximately $48 billion in annual transaction volume.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the best practices for test data isolation in Playwright are:  1. Pre... |
| concept-02-prompt-injection-types | best-practices | n/a | 0.93 | PASS | The context groups prompt‑injection threats into a handful of distinct categories that a QA team sho... |