# Ragas Evaluation Report

_Generated: 2026-08-15T18:02:39.981874+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.994 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.798 | ≥ 0.55 | PASS |
| Keyword check pass rate | 86.7% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.47 | PASS | Seven specialized AI agents were deployed at FinNova Bank. These agents were designed to address spe... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.88 | PASS | Production bugs dropped by 67% at FinNova Bank. Specifically, the production P1/P2 bugs per month we... |
| finnova-03-cost-savings | metrics | 1.00 | 0.87 | PASS | FinNova saved an estimated $2.4 million annually in operating costs after the engagement.... |
| finnova-04-mttd | metrics | 1.00 | 0.96 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not contain specific information about the flake rate before and after any... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, some best practices for test data isolation in Playwright include:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.97 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, a structured ... |
| concept-06-mcp-architecture | best-practices | 0.90 | 0.99 | PASS | The Model Context Protocol (MCP) is a standard designed to facilitate context exchange between auton... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 1.00 | PASS | For AI/LLM features in CI/CD pipelines, several quality gates should be in place:  1. **Dataset Desi... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.88 | PASS | The methodology for AI red teaming described in the context operates on a different plane compared t... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The context provided does not contain any information about FinNova Bank's CEO or their favorite col... |