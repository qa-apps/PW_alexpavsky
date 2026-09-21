# Ragas Evaluation Report

_Generated: 2026-07-01T18:34:15.280901+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.921 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.769 | ≥ 0.55 | PASS |
| Keyword check pass rate | 85.2% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | Seven specialized AI agents were deployed at FinNova Bank.... |
| finnova-02-bug-reduction | metrics | 1.00 | 1.00 | PASS | Based on the provided context, production bugs at FinNova Bank dropped by **67%**.  (Before: 18.4 P1... |
| finnova-03-cost-savings | metrics | 1.00 | 0.80 | PASS | FinNova saved **$2.4 million annually** in operating costs after deploying the AI agents and moderni... |
| finnova-04-mttd | metrics | n/a | 0.39 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.56 | FAIL | Based on the provided context, the flake rate before implementing the Playwright test improvements w... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | 1.00 | 0.87 | PASS | During the Black Friday wire transfer outage in November 2024, the FinNova Bank's system experienced... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context provided does not contain specific information about an incident prevented by the Red Te... |
| finnova-12-kafka-incident | incidents | 0.50 | 0.00 | FAIL | The provided context does not contain any information about events, catches, or specific dates such ... |
| finnova-13-test-generator-agent | agents | 0.57 | 0.78 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated tests from user stori... |
| finnova-14-rag-quality-gate | agents | 0.80 | 0.95 | PASS | Agent 3 - RAG Quality Gate is designed to validate LLM-powered customer support responses against th... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, here are the best practices for test data isolation in Playwright:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 0.98 | 0.97 | PASS | Based on the provided context, hallucinations in RAG (Retrieval-Augmented Generation) systems can be... |
| concept-04-page-object-model | best-practices | 0.58 | 0.79 | PASS | The **classic Page Object Model (POM)** tends to create monolithic page objects that encapsulate all... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | The key principles when designing **LLM-as-a-Judge evaluation frameworks** are:  1. **Separation of ... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.90 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 0.85 | 1.00 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a multi-la... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | PASS | Based on the provided context, here are the key quality gates that should be in place for AI/LLM fea... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.90 | PASS | Based on the provided context, the methodology for AI red teaming involves systematically targeting ... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 0.67 | 0.00 | FAIL | The context does not provide information about the number of employees from Anthropic who worked on ... |