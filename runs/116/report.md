# Ragas Evaluation Report

_Generated: 2026-08-22T18:04:14.245415+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.931 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.835 | ≥ 0.55 | PASS |
| Keyword check pass rate | 73.3% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | Seven specialized AI agents were deployed at FinNova Bank. These agents were designed to address spe... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.95 | PASS | Production bugs dropped by 67% at FinNova Bank. Specifically, the metric "Production P1/P2 bugs per ... |
| finnova-03-cost-savings | metrics | 1.00 | 0.87 | PASS | FinNova saved an estimated $2.4 million annually in operating costs after the engagement.... |
| finnova-04-mttd | metrics | 1.00 | 0.97 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not contain specific information about flake rates before and after any en... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | FAIL | Some best practices for test data isolation in Playwright include:  - Prefer user-facing locators an... |
| concept-02-prompt-injection-types | best-practices | 0.86 | 1.00 | PASS | QA should test for three main categories of prompt injection attacks:  1. Direct Prompt Injection: W... |
| concept-03-rag-hallucination | best-practices | 0.89 | 0.97 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, several strat... |
| concept-06-mcp-architecture | best-practices | 0.90 | 1.00 | PASS | The Model Context Protocol (MCP) is an architecture and protocol designed to standardize context exc... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.93 | PASS | Quality gates for AI/LLM features in CI/CD pipelines should be explicit from discovery to production... |
| concept-10-red-teaming-methodology | best-practices | 0.64 | 0.89 | FAIL | The methodology for AI red teaming described in the context focuses on identifying and exploiting vu... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The context provided does not contain any information about FinNova Bank's CEO or their favorite col... |