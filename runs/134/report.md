# Ragas Evaluation Report

_Generated: 2026-09-09T09:26:09.826330+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.000 | ≥ 0.65 | FAIL |
| Average answer_relevancy | 0.000 | ≥ 0.55 | FAIL |
| Keyword check pass rate | 93.3% | ≥ 60% | PASS |
| Questions evaluated     | 15 | — | — |
| Judge model             | `ollama/gpt-oss:120b (+0 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | n/a | n/a | PASS | FinNova Bank deployed **seven** specialized AI agents.... |
| finnova-02-bug-reduction | metrics | n/a | n/a | PASS | The production bugs at FinNova Bank dropped by 67% after the implementation of the AI agents and oth... |
| finnova-03-cost-savings | metrics | n/a | n/a | PASS | FinNova Bank saved an estimated $2.4 million annually in operating costs after implementing the QA t... |
| finnova-04-mttd | metrics | n/a | n/a | PASS | The mean time to detection (MTTD) before the engagement was 4 hours 30 minutes, and after the engage... |
| finnova-05-test-cases | facts | n/a | n/a | PASS | The Test Generator agent produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | n/a | n/a | FAIL | The text does not explicitly state the flake rate before and after the engagement. However, it menti... |
| finnova-07-customers | facts | n/a | n/a | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | n/a | n/a | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion. This information is foun... |
| concept-01-test-isolation | best-practices | n/a | n/a | PASS | In the context of Playwright, a popular web automation framework, test data isolation is a critical ... |
| concept-02-prompt-injection-types | best-practices | n/a | n/a | PASS | The document outlines several categories of prompt injection attacks that QA (Quality Assurance) tea... |
| concept-03-rag-hallucination | best-practices | n/a | n/a | PASS | To measure and prevent hallucinations in RAG (Retrieval-Augmented Generation) systems, several strat... |
| concept-06-mcp-architecture | best-practices | n/a | n/a | PASS | The Model Context Protocol (MCP) is an open‑standard architecture that defines a unified, JSON‑RPC‑b... |
| concept-09-ci-quality-gates | best-practices | n/a | n/a | PASS | **Quality‑gate checklist for AI/LLM features in CI/CD**  1. **Business‑risk definition (design stage... |
| concept-10-red-teaming-methodology | best-practices | n/a | n/a | PASS | **Methodology for AI Red‑Team­ing**  1. **Treat prompts as attack surfaces** – Just as a penetration... |
| negative-01-no-info | refusal | n/a | n/a | PASS | The provided context does not mention the CEO of FinNova Bank, nor does it include any information a... |