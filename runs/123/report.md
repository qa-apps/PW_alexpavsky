# Ragas Evaluation Report

_Generated: 2026-08-29T20:05:35.831799+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.996 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.834 | ≥ 0.55 | PASS |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | Seven specialized AI agents were deployed at FinNova Bank. These agents included the Test Generator,... |
| finnova-02-bug-reduction | metrics | 1.00 | 1.00 | PASS | Production bugs dropped by 67% at FinNova Bank. Specifically, the production P1/P2 bugs per month we... |
| finnova-03-cost-savings | metrics | 1.00 | 0.87 | PASS | FinNova saved an estimated $2.4 million annually in operating costs. This can be seen from the compa... |
| finnova-04-mttd | metrics | 1.00 | 0.99 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not include specific flake rate data before and after any engagement. It m... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 0.95 | PASS | According to the client background provided, FinNova Bank handles approximately $48 billion in annua... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Best practices for test data isolation in Playwright include several key strategies:  1. **Prefer Us... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | 0.95 | 0.90 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, you should fo... |
| concept-06-mcp-architecture | best-practices | 1.00 | 1.00 | PASS | The Model Context Protocol (MCP) is designed to standardize context exchange for reliable and determ... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.97 | FAIL | For AI/LLM features in CI/CD pipelines, the following quality gates should be in place:  1. **Design... |
| concept-10-red-teaming-methodology | best-practices | n/a | 0.90 | PASS | The methodology for AI red teaming, as described in the document, focuses on adversarial testing to ... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO's favorite color.... |