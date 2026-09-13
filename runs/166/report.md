# Ragas Evaluation Report

_Generated: 2026-09-13T06:15:17.605473+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 1.000 | ≥ 0.50 | PASS |
| Average answer_relevancy | 0.849 | ≥ 0.35 | PASS |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 10 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.95 | PASS | FinNova Bank’s transformation deployed **seven** specialized AI agents.... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.93 | PASS | The production bugs at FinNova Bank dropped by 67% according to the 12-month outcomes.... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved $2.4M annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 0.62 | PASS | Before: 4 hours 30 minutes   After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 1.00 | PASS | The Test Generator agent produced 3,247 automated test cases.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context provided does not give specific flake rate numbers before and after the engagement. It d... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 0.99 | PASS | FinNova Bank handles approximately $48 billion in annual transaction volume.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | FAIL | Best practices for test data isolation in Playwright include:  1. Use API setup where UI setup adds ... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | The main categories of prompt injection attacks that QA should test for are:  1. Direct Prompt Injec... |