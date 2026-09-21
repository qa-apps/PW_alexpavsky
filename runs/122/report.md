# Ragas Evaluation Report

_Generated: 2026-08-29T01:16:07.794156+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.926 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.872 | ≥ 0.55 | PASS |
| Keyword check pass rate | 80.0% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.94 | PASS | Seven specialized AI agents were deployed at FinNova Bank. These agents were responsible for various... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.64 | PASS | Production bugs dropped by 67%. Specifically, the production P1/P2 bugs per month fell from 18.4 bef... |
| finnova-03-cost-savings | metrics | 1.00 | 1.00 | PASS | FinNova saved an estimated $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | 1.00 | 1.00 | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 0.60 | 0.00 | FAIL | The provided context does not contain specific information about the flake rate before and after a p... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | n/a | PASS | Based on the provided context, some best practices for test data isolation in Playwright include:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | 0.47 | 0.98 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, the document ... |
| concept-06-mcp-architecture | best-practices | n/a | 0.98 | PASS | The Model Context Protocol (MCP) is designed to standardize context exchange between autonomous AI a... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | FAIL | For AI/LLM features in CI/CD pipelines, several quality gates should be in place:  1. **Design Phase... |
| concept-10-red-teaming-methodology | best-practices | 0.89 | 0.90 | PASS | The methodology for AI red teaming, as described in the document, focuses on adversarial testing str... |
| negative-01-no-info | refusal | 1.00 | n/a | PASS | The context provided does not contain information about FinNova Bank's CEO or their favorite color. ... |