# Ragas Evaluation Report

_Generated: 2026-09-13T05:32:25.303455+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.889 | ≥ 0.50 | PASS |
| Average answer_relevancy | 0.000 | ≥ 0.35 | FAIL |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 10 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | n/a | PASS | FinNova Bank deployed **seven** specialized AI agents.... |
| finnova-02-bug-reduction | metrics | 1.00 | n/a | PASS | Production P1/P2 bugs per month dropped by 67% (from 18.4 to 6.1).... |
| finnova-03-cost-savings | metrics | 1.00 | n/a | PASS | FinNova saved $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | n/a | PASS | Before: 4 hours 30 minutes   After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | n/a | PASS | The Test Generator agent produced 3,247 automated test cases.... |
| finnova-06-flake-rate | metrics | 0.00 | n/a | FAIL | The provided context does not contain any information about the flake rate before or after any engag... |
| finnova-07-customers | facts | 1.00 | n/a | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | n/a | PASS | FinNova Bank handles approximately $48 billion in annual transaction volume.... |
| concept-01-test-isolation | best-practices | 1.00 | n/a | FAIL | The best practices for test data isolation in Playwright include:  1. Use API setup where UI setup a... |
| concept-02-prompt-injection-types | best-practices | n/a | n/a | PASS | The main categories of prompt injection attacks that QA should test for are:  1. Direct Prompt Injec... |