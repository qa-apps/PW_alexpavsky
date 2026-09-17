# Ragas Evaluation Report

_Generated: 2026-09-17T17:20:02.753706+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.708 | ≥ 0.50 | PASS |
| Average answer_relevancy | 0.000 | ≥ 0.35 | FAIL |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 10 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | n/a | PASS | FinNova Bank’s QA transformation deployed **seven (7) specialized AI agents**. 【Context: “The engage... |
| finnova-02-bug-reduction | metrics | 1.00 | n/a | PASS | 67%.... |
| finnova-03-cost-savings | metrics | 0.67 | n/a | PASS | According to the context, FinNova saved $2.4 million annually in operating costs after the QA transf... |
| finnova-04-mttd | metrics | 0.00 | n/a | FAIL | The context does not contain information about the mean time to detection (MTTD) before and after th... |
| finnova-05-test-cases | facts | 1.00 | n/a | PASS | The Test Generator agent produced 3,247 automated test cases.... |
| finnova-06-flake-rate | metrics | 0.00 | n/a | FAIL | The provided context does not contain any information about the flake rate before or after the engag... |
| finnova-07-customers | facts | 1.00 | n/a | PASS | FinNova Bank serves 2.4 million retail customers. This information is found in the "Client Backgroun... |
| finnova-08-transaction-volume | facts | 1.00 | n/a | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion. This information is foun... |
| concept-01-test-isolation | best-practices | n/a | n/a | PASS | Based on the provided context, the best practices for test data isolation in Playwright include:  1.... |
| concept-02-prompt-injection-types | best-practices | n/a | n/a | PASS | **Main categories of prompt‑injection attacks that QA should cover**  \| Category \| Typical mechanism... |