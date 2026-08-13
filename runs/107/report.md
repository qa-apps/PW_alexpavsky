# Ragas Evaluation Report

_Generated: 2026-08-13T18:42:51.640750+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.994 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.808 | ≥ 0.55 | PASS |
| Keyword check pass rate | 86.7% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | Seven specialized AI agents were deployed at FinNova Bank.... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.50 | PASS | Production P1/P2 bugs per month dropped by 67%. Specifically, the metric decreased from 18.4 bugs pe... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved an estimated $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 0.95 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not include specific flake rate numbers before and after an engagement. It... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | n/a | 1.00 | PASS | The annual transaction volume of FinNova Bank is $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | FAIL | Best practices for test data isolation in Playwright include:  - Prefer user-facing locators and sta... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | According to the provided context, QA should test for the following main categories of prompt inject... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.98 | PASS | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, you should co... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.91 | PASS | The Model Context Protocol (MCP) is designed to standardize context exchange for reliable and determ... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.95 | PASS | Quality gates for AI/LLM features in CI/CD pipelines should ensure that the system can grow with the... |
| concept-10-red-teaming-methodology | best-practices | 0.91 | 0.89 | PASS | The methodology for AI red teaming described in the context focuses on testing the natural language ... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO's favorite color.... |