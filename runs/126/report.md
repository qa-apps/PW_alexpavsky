# Ragas Evaluation Report

_Generated: 2026-09-01T20:16:37.614439+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.933 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.829 | ≥ 0.55 | PASS |
| Keyword check pass rate | 86.7% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.94 | PASS | At FinNova Bank, seven specialized AI agents were deployed. These agents were responsible for specif... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.96 | PASS | Production bugs dropped by 67% at FinNova Bank. Specifically, the production P1/P2 bugs per month we... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved an estimated $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 1.00 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not include specific data on flake rates before and after any engagement. ... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Test data isolation in Playwright should be approached as a system design problem rather than a narr... |
| concept-02-prompt-injection-types | best-practices | n/a | 1.00 | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | 0.74 | 0.96 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generational) systems, you can fol... |
| concept-06-mcp-architecture | best-practices | 0.96 | 0.92 | PASS | The Model Context Protocol (MCP) is a standardized architecture designed to enable reliable and dete... |
| concept-09-ci-quality-gates | best-practices | 0.53 | n/a | PASS | For AI/LLM features in CI/CD pipelines, the following quality gates should be established:  1. **Dat... |
| concept-10-red-teaming-methodology | best-practices | 0.83 | 0.89 | PASS | The methodology for AI red teaming, as detailed in the provided context, involves targeting vulnerab... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |