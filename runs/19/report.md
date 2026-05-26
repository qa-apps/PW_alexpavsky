# Ragas Evaluation Report

_Generated: 2026-05-26T05:05:04.377697+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.915 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.749 | ≥ 0.55 | PASS |
| Keyword check pass rate | 88.9% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 1.00 | PASS | 7 specialized AI agents were deployed at FinNova Bank.... |
| finnova-02-bug-reduction | metrics | n/a | 0.99 | PASS | The production bugs at FinNova Bank dropped by 67%.... |
| finnova-03-cost-savings | metrics | 1.00 | 0.81 | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | 1.00 | 0.37 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific numerical values for the flake rate before and after the engag... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | n/a | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | n/a | 0.79 | PASS | The Black Friday wire transfer outage in November 2024 at FinNova Bank lasted **3 hours and 22 minut... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not provide specific information about an incident prevented by the Red Team Bot on... |
| finnova-12-kafka-incident | incidents | 0.67 | 0.00 | FAIL | The context provided does not contain any information about events or incidents that occurred on May... |
| finnova-13-test-generator-agent | agents | 0.62 | 0.82 | PASS | The **Test Generator** agent (Agent 1) is responsible for creating automated tests from user stories... |
| finnova-14-rag-quality-gate | agents | 0.62 | 1.00 | PASS | Agent 3 - RAG Quality Gate is designed to validate LLM-powered customer support responses against th... |
| finnova-15-red-team-vulns | agents | n/a | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | n/a | 1.00 | PASS | Based on the provided context, here are the best practices for test data isolation in Playwright:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | n/a | 0.96 | PASS | To measure and prevent hallucinations in **RAG (Retrieval-Augmented Generation) systems**, the provi... |
| concept-04-page-object-model | best-practices | 0.82 | 0.94 | PASS | The **classic Page Object Model (POM)** tends to create large, monolithic page objects that encapsul... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the key principles for designing **LLM-as-a-Judge evaluation framewor... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.85 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 0.81 | 0.94 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a **multi-... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.95 | PASS | Based on the provided context, the following **quality gates** should be in place for AI/LLM feature... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.90 | PASS | The methodology for **AI red teaming** as described in the context focuses on systematically testing... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 1.00 | 0.00 | PASS | The context does not provide information about the number of employees from Anthropic who worked on ... |