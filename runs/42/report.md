# Ragas Evaluation Report

_Generated: 2026-06-18T18:42:45.103356+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.915 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.780 | ≥ 0.55 | PASS |
| Keyword check pass rate | 81.5% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.98 | PASS | Seven specialized AI agents were deployed at FinNova Bank. They were:  1. Test Generator 2. Test Hea... |
| finnova-02-bug-reduction | metrics | n/a | 0.98 | PASS | Production bugs at FinNova Bank dropped by 67%.... |
| finnova-03-cost-savings | metrics | n/a | 1.00 | PASS | FinNova saved $2.4 million annually in operating costs.... |
| finnova-04-mttd | metrics | n/a | 0.97 | PASS | The mean time to detection (MTTD) was 4 hours 30 minutes before the engagement, and 12 minutes after... |
| finnova-05-test-cases | facts | n/a | 0.94 | PASS | The Test Generator agent (Agent 1) produced 3,247 automated test cases over 12 months.... |
| finnova-06-flake-rate | metrics | 0.40 | 0.00 | FAIL | The context does not contain enough information to provide the flake rate before and after the engag... |
| finnova-07-customers | facts | n/a | 1.00 | PASS | FinNova Bank serves 2.4 million retail customers.... |
| finnova-08-transaction-volume | facts | n/a | 1.00 | PASS | The annual transaction volume of FinNova Bank is approximately $48 billion.... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin, Texas, and Krakow, Poland.... |
| finnova-10-black-friday | incidents | 1.00 | 0.95 | PASS | The Black Friday wire transfer outage in November 2024 caused 3 hours and 22 minutes of degraded ser... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not contain enough information to answer the question about the specific incident t... |
| finnova-12-kafka-incident | incidents | 0.88 | 0.00 | FAIL | The context does not contain enough information to answer this question. There is no mention of a "D... |
| finnova-13-test-generator-agent | agents | 1.00 | 0.71 | PASS | The Test Generator agent (Agent 1) generates Playwright + TypeScript tests from user stories, produc... |
| finnova-14-rag-quality-gate | agents | 1.00 | 1.00 | PASS | The purpose of Agent 3 - RAG Quality Gate is to validate LLM-powered customer support responses agai... |
| finnova-15-red-team-vulns | agents | 1.00 | n/a | PASS | The Red Team Bot caught 47 high-severity vulnerabilities before production.... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | According to the provided context, the best practices for test data isolation in Playwright include:... |
| concept-02-prompt-injection-types | best-practices | 0.75 | 0.99 | PASS | The main categories of prompt injection attacks that QA should test for are:  1. Direct Prompt Injec... |
| concept-03-rag-hallucination | best-practices | 0.81 | 0.96 | PASS | The context does not provide a direct and detailed answer to the question of how to measure and prev... |
| concept-04-page-object-model | best-practices | 1.00 | 0.92 | PASS | The classic Page Object Model (POM) can become bloated and collapse under complex Single Page Applic... |
| concept-05-llm-judge-principles | best-practices | 0.79 | 1.00 | FAIL | The context provided does not contain a clear and concise list of key principles for designing LLM-a... |
| concept-06-mcp-architecture | best-practices | 1.00 | 1.00 | PASS | The Model Context Protocol (MCP) is an open-standard architecture that provides a unified interface ... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | According to the provided context, the following strategies are most effective at reducing test flak... |
| concept-08-kafka-validation | best-practices | 0.93 | 0.99 | PASS | According to the provided context, testing event-driven systems with Kafka in distributed environmen... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | PASS | The context provides several quality gates that should be in place for AI/LLM features in CI/CD pipe... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.93 | FAIL | The methodology for AI red teaming involves targeting vulnerabilities within the natural language pr... |
| negative-01-no-info | refusal | n/a | 0.00 | PASS | There is no information provided in the context about FinNova Bank's CEO or their favorite color.... |
| negative-02-fabrication | refusal | 0.75 | 0.00 | PASS | The provided context does not contain enough information to answer the question about the number of ... |