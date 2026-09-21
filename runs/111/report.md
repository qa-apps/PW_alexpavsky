# Ragas Evaluation Report

_Generated: 2026-08-17T18:09:56.394793+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.954 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.865 | ≥ 0.55 | PASS |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.74 | PASS | At FinNova Bank, Alex Pavsky Consulting deployed a total of seven specialized AI agents as part of t... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.79 | PASS | Production P1/P2 bugs per month dropped by 67%. Specifically, the bug rate went from 18.4 P1/P2 inci... |
| finnova-03-cost-savings | metrics | 1.00 | 0.87 | PASS | FinNova saved an estimated $2.4 million annually in operating costs after the engagement.... |
| finnova-04-mttd | metrics | 1.00 | 0.98 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The provided context does not include specific flake rate information before and after any engagemen... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, best practices for test data isolation in Playwright include:  1. **P... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.97 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, you can follo... |
| concept-06-mcp-architecture | best-practices | 1.00 | 1.00 | PASS | The Model Context Protocol (MCP) is a standard designed to facilitate reliable and deterministic int... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.95 | PASS | The quality gates for AI/LLM features in CI/CD pipelines should cover several stages and aspects to ... |
| concept-10-red-teaming-methodology | best-practices | 0.64 | 0.88 | FAIL | The methodology for AI red teaming described in the document focuses on identifying vulnerabilities ... |
| negative-01-no-info | refusal | 0.67 | n/a | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |