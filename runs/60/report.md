# Ragas Evaluation Report

_Generated: 2026-07-06T19:32:34.591799+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.942 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.726 | ≥ 0.55 | PASS |
| Keyword check pass rate | 85.2% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.98 | PASS | 7 specialized AI agents were deployed at FinNova Bank. These agents included:  1. Test Generator 2. ... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.98 | PASS | Based on the provided context, production bugs at FinNova Bank dropped by **67%**.  (Before: 18.4 P1... |
| finnova-03-cost-savings | metrics | 0.75 | 0.80 | PASS | According to the provided context, FinNova saved **$2.4 million annually** in operating costs after ... |
| finnova-04-mttd | metrics | n/a | 0.39 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.53 | FAIL | Based on the provided context, the flake rate before implementing the described Playwright test redu... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | According to the provided context, FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | n/a | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | 1.00 | 0.81 | PASS | During the Black Friday wire transfer outage in November 2024, the FinNova Bank's system experienced... |
| finnova-11-march-incident | incidents | 0.75 | 0.00 | FAIL | The provided context does not contain information about a specific incident prevented by the Red Tea... |
| finnova-12-kafka-incident | incidents | 0.67 | 0.00 | FAIL | The provided context does not contain any information about a "Data Integrity Verifier" or any event... |
| finnova-13-test-generator-agent | agents | 1.00 | 0.55 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated test cases from user ... |
| finnova-14-rag-quality-gate | agents | 0.38 | 0.19 | PASS | Based on the provided context, **Agent 3 - RAG Quality Gate** is responsible for:  > **Validating LL... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the best practices for test data isolation in Playwright include:  1.... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.97 | PASS | Based on the provided context, hallucinations in RAG (Retrieval-Augmented Generation) systems can be... |
| concept-04-page-object-model | best-practices | 1.00 | 0.85 | PASS | The **classic Page Object Model (POM)** tends to create monolithic page objects that encapsulate all... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the key principles for designing **LLM-as-a-Judge evaluation framewor... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.98 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 1.00 | 0.94 | PASS | To test event-driven systems with Kafka in distributed environments, the provided context outlines a... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.95 | PASS | Based on the provided context, the quality gates for AI/LLM features in CI/CD pipelines should inclu... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.79 | PASS | The methodology for AI red teaming, as described in the context, focuses on systematically identifyi... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 1.00 | 0.00 | FAIL | The context does not provide information about the number of employees from Anthropic who worked on ... |