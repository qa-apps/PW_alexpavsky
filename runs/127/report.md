# Ragas Evaluation Report

_Generated: 2026-09-02T20:16:34.199436+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 1.000 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.741 | ≥ 0.55 | PASS |
| Keyword check pass rate | 73.3% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | n/a | 0.99 | PASS | Seven specialized AI agents were deployed at FinNova Bank. These agents included a Test Generator, T... |
| finnova-02-bug-reduction | metrics | n/a | n/a | PASS | Production bugs dropped by 67% at FinNova Bank. Specifically, the production P1/P2 bugs per month re... |
| finnova-03-cost-savings | metrics | n/a | n/a | PASS | FinNova saved an estimated $2.4 million annually in operating costs after the QA transformation.... |
| finnova-04-mttd | metrics | n/a | n/a | PASS | Before the engagement, the mean time to detection (MTTD) was 4 hours and 30 minutes. After the engag... |
| finnova-05-test-cases | facts | 1.00 | n/a | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | n/a | n/a | FAIL | The provided context does not contain specific flake rate information before and after an engagement... |
| finnova-07-customers | facts | 1.00 | n/a | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | n/a | n/a | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Best practices for test data isolation in Playwright include:  - Prefer user-facing locators and sta... |
| concept-02-prompt-injection-types | best-practices | n/a | n/a | PASS | QA should test for the following main categories of prompt injection attacks:  1. Direct Prompt Inje... |
| concept-03-rag-hallucination | best-practices | n/a | 0.98 | FAIL | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, a systematic ... |
| concept-06-mcp-architecture | best-practices | 1.00 | n/a | PASS | The Model Context Protocol (MCP) is designed to standardize context exchange between autonomous AI a... |
| concept-09-ci-quality-gates | best-practices | 1.00 | n/a | FAIL | For AI/LLM features in CI/CD pipelines, several quality gates should be in place:  1. **Design Phase... |
| concept-10-red-teaming-methodology | best-practices | n/a | n/a | FAIL | The methodology for AI red teaming described in the document focuses on identifying vulnerabilities ... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |