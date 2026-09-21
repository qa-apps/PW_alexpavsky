# Ragas Evaluation Report

_Generated: 2026-09-09T18:07:59.975247+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.000 | ≥ 0.65 | FAIL |
| Average answer_relevancy | 0.000 | ≥ 0.55 | FAIL |
| Keyword check pass rate | 86.7% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | n/a | n/a | PASS | 7... |
| finnova-02-bug-reduction | metrics | n/a | n/a | PASS | 67%... |
| finnova-03-cost-savings | metrics | n/a | n/a | FAIL | FinNova saved **$2.4 million per year** in operating costs.... |
| finnova-04-mttd | metrics | n/a | n/a | PASS | The mean time to detection (MTTD) before the engagement was 4 hours 30 minutes, and after the engage... |
| finnova-05-test-cases | facts | n/a | n/a | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | n/a | n/a | FAIL | The text does not explicitly state the flake rate before and after the engagement. However, it menti... |
| finnova-07-customers | facts | n/a | n/a | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | n/a | n/a | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion. This information is foun... |
| concept-01-test-isolation | best-practices | n/a | n/a | PASS | In the context of Playwright, a robust testing framework for web applications, test data isolation i... |
| concept-02-prompt-injection-types | best-practices | n/a | n/a | PASS | The main categories of prompt injection attacks that QA should test for are:  1. **Direct Prompt Inj... |
| concept-03-rag-hallucination | best-practices | n/a | n/a | PASS | Measuring and preventing hallucinations in RAG (Retrieval-Augmented Generation) systems is a critica... |
| concept-06-mcp-architecture | best-practices | n/a | n/a | PASS | The Model Context Protocol (MCP) is an open-standard architecture designed to provide an abstraction... |
| concept-09-ci-quality-gates | best-practices | n/a | n/a | PASS | **Quality‑gate checklist for AI/LLM work‑flows (as described in the source material)**    \| Gate (pi... |
| concept-10-red-teaming-methodology | best-practices | n/a | n/a | PASS | The methodology for AI red teaming described in the document is a comprehensive approach to identify... |
| negative-01-no-info | refusal | n/a | n/a | PASS | The information provided does not mention the CEO of FinNova Bank, nor does it include any details a... |