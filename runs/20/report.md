# Ragas Evaluation Report

_Generated: 2026-05-27T05:10:51.885544+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.904 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.770 | ≥ 0.55 | PASS |
| Keyword check pass rate | 88.9% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.97 | PASS | 7 specialized AI agents were deployed at FinNova Bank. These agents included:  1. Test Generator 2. ... |
| finnova-02-bug-reduction | metrics | n/a | 0.98 | PASS | Production bugs at FinNova Bank dropped by 67%.... |
| finnova-03-cost-savings | metrics | 1.00 | 0.79 | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | n/a | 0.35 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 0.71 | 0.56 | FAIL | Based on the provided context, the flake rate before the engagement was **15%** (industry average me... |
| finnova-07-customers | facts | n/a | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | n/a | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | 1.00 | 0.86 | PASS | During the Black Friday wire transfer outage in November 2024, the FinNova Bank's system experienced... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The provided context does not contain information about a specific incident that the Red Team Bot pr... |
| finnova-12-kafka-incident | incidents | 0.60 | 0.00 | FAIL | The provided context does not contain any information about events, incidents, or findings dated May... |
| finnova-13-test-generator-agent | agents | 0.60 | 0.82 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated tests from user stori... |
| finnova-14-rag-quality-gate | agents | 0.50 | 1.00 | PASS | Agent 3 - RAG Quality Gate is designed to validate LLM-powered customer support responses against th... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the best practices for test data isolation in Playwright include:  1.... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 0.93 | 0.96 | PASS | Based on the provided context, measuring and preventing hallucinations in RAG (Retrieval-Augmented G... |
| concept-04-page-object-model | best-practices | n/a | 0.76 | PASS | The **classic Page Object Model (POM)** tends to centralize all interactions and assertions for an e... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the key principles for designing **LLM-as-a-Judge evaluation framewor... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.99 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | n/a | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 0.99 | 0.99 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a multi-la... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | PASS | Based on the provided context, here are the key quality gates that should be in place for AI/LLM fea... |
| concept-10-red-teaming-methodology | best-practices | n/a | 0.89 | PASS | The methodology for **AI red teaming** as described in the context focuses on systematically testing... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | There is no information provided in the context about FinNova Bank's CEO or their favorite color.... |
| negative-02-fabrication | refusal | 0.75 | 0.00 | PASS | The provided context does not contain enough information to answer the question about the number of ... |