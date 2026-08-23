# Ragas Evaluation Report

_Generated: 2026-08-23T18:02:38.430002+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 1.000 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.818 | ≥ 0.55 | PASS |
| Keyword check pass rate | 93.3% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | Seven specialized AI agents were deployed at FinNova Bank.... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.62 | PASS | Production P1/P2 bugs per month dropped by 67%. Before the implementation, there were 18.4 productio... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved an estimated $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 0.99 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not include specific flake rate data before and after any engagement. Ther... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Best practices for test data isolation in Playwright include:  1. Retain traces for failures and fir... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | The main categories of prompt injection attacks that QA should test for include:  1. **Direct Prompt... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.97 | PASS | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, the document ... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.87 | PASS | The Model Context Protocol (MCP) is an open-standard architecture designed to standardize context ex... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | PASS | For AI/LLM features in CI/CD pipelines, the following quality gates should be in place:  1. **Design... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.92 | PASS | The methodology for AI red teaming, as described in the context, focuses on adversarial testing of n... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |