# Ragas Evaluation Report

_Generated: 2026-05-21T00:22:15.824767+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.972 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.760 | ≥ 0.55 | PASS |
| Keyword check pass rate | 85.2% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.91 | PASS | According to the provided context, **7 specialized AI agents** were deployed at FinNova Bank as part... |
| finnova-02-bug-reduction | metrics | 1.00 | 0.99 | PASS | The production bugs at FinNova Bank dropped by 67%.... |
| finnova-03-cost-savings | metrics | 1.00 | 0.81 | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | 1.00 | 0.38 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific numerical values for the flake rate before and after the engag... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | 1.00 | 1.00 | PASS | The annual transaction volume of FinNova Bank is **$48 billion**.... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin (TX) and Krakow (Poland).... |
| finnova-10-black-friday | incidents | n/a | 0.97 | PASS | During the Black Friday wire transfer outage in November 2024, six of the nine contributing defects ... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not provide specific information about an incident prevented by the Red Team Bot on... |
| finnova-12-kafka-incident | incidents | 1.00 | 0.00 | FAIL | The provided context does not contain any information about events, incidents, or findings from May ... |
| finnova-13-test-generator-agent | agents | 1.00 | 0.80 | PASS | The Test Generator agent (Agent 1) generates Playwright + TypeScript tests from user stories. Over 1... |
| finnova-14-rag-quality-gate | agents | 0.38 | 1.00 | PASS | Agent 3 - RAG Quality Gate is designed to validate LLM-powered customer support responses against th... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the best practices for test data isolation in Playwright include:  1.... |
| concept-02-prompt-injection-types | best-practices | n/a | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.98 | PASS | Based on the provided context, here’s how you can measure and prevent hallucinations in RAG systems:... |
| concept-04-page-object-model | best-practices | 1.00 | 0.97 | PASS | The **classic Page Object Model (POM)** and the **Component-Driven Page Object Model (POM)** differ ... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the key principles when designing LLM-as-a-judge evaluation framework... |
| concept-06-mcp-architecture | best-practices | 0.98 | 0.97 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 0.96 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 1.00 | 0.94 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a **multi-... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.99 | PASS | Based on the provided context, here are the **quality gates** that should be in place for AI/LLM fea... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.89 | PASS | The methodology for AI red teaming, as described in the provided context, focuses on systematically ... |
| negative-01-no-info | refusal | 1.00 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 1.00 | 0.00 | FAIL | The context does not provide any information about the number of employees from Anthropic who worked... |