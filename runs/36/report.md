# Ragas Evaluation Report

_Generated: 2026-06-12T18:35:03.022481+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.910 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.745 | ≥ 0.55 | PASS |
| Keyword check pass rate | 85.2% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | n/a | 1.00 | PASS | 7 specialized AI agents were deployed at FinNova Bank.... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.99 | PASS | Production bugs at FinNova Bank dropped by **67%**.  (From the context: "Production P1/P2 bugs per m... |
| finnova-03-cost-savings | metrics | 1.00 | n/a | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | n/a | 0.37 | PASS | Before: 4 hours 30 minutes After: 12 minutes (-96%)... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent (Agent 1) produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific flake rate metrics before and after the engagement. It only me... |
| finnova-07-customers | facts | n/a | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | n/a | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | n/a | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | 1.00 | 0.79 | PASS | During the Black Friday wire transfer outage in November 2024, the FinNova Bank system experienced d... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not provide specific information about an incident prevented by the Red Team Bot on... |
| finnova-12-kafka-incident | incidents | 0.40 | 0.00 | FAIL | The provided context does not contain any information about events, incidents, or findings related t... |
| finnova-13-test-generator-agent | agents | 1.00 | 0.80 | PASS | The Test Generator agent (Agent 1) generates Playwright + TypeScript tests from user stories. Over 1... |
| finnova-14-rag-quality-gate | agents | 1.00 | 1.00 | PASS | Based on the provided context, **Agent 3 - RAG Quality Gate** is designed to validate LLM-powered cu... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | 0.97 | 1.00 | PASS | Based on the provided context, here are the best practices for test data isolation in Playwright:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 0.91 | 0.96 | PASS | Based on the provided context, here’s how hallucinations in RAG (Retrieval-Augmented Generation) sys... |
| concept-04-page-object-model | best-practices | 0.59 | 0.90 | PASS | The key difference between the **classic Page Object Model (POM)** and the **Component-Driven Page O... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the key principles when designing **LLM-as-a-Judge evaluation framewo... |
| concept-06-mcp-architecture | best-practices | n/a | 0.87 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 0.91 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 1.00 | 0.97 | PASS | To test event-driven systems with Kafka in distributed environments, the provided context outlines a... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.95 | PASS | Based on the provided context, the quality gates for AI/LLM features in CI/CD pipelines should inclu... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.86 | PASS | The methodology for AI red teaming, as described in the provided context, focuses on systematically ... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 0.67 | 0.00 | FAIL | The context does not provide information about the number of employees from Anthropic who worked on ... |