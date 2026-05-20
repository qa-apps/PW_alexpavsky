# Ragas Evaluation Report

_Generated: 2026-05-20T17:05:17.779439+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.626 | ≥ 0.65 | FAIL |
| Average answer_relevancy | 0.510 | ≥ 0.55 | FAIL |
| Keyword check pass rate | 59.3% | ≥ 60% | FAIL |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.91 | PASS | According to the provided context, **7 specialized AI agents** were deployed at FinNova Bank as part... |
| finnova-02-bug-reduction | metrics | 0.00 | 0.00 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-03-cost-savings | metrics | 0.00 | 0.07 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-04-mttd | metrics | 0.00 | 0.00 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-05-test-cases | facts | 0.00 | 0.00 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific numerical values for the flake rate before and after the engag... |
| finnova-07-customers | facts | n/a | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | 0.00 | 0.06 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-09-locations | facts | 1.00 | 1.00 | PASS | FinNova Bank's engineering hubs are located in Austin, Texas (TX) and Krakow, Poland.... |
| finnova-10-black-friday | incidents | n/a | 0.31 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not provide specific information about an incident prevented by the Red Team Bot on... |
| finnova-12-kafka-incident | incidents | 1.00 | 0.00 | FAIL | The provided context does not contain any information about what the "Data Integrity Verifier" caugh... |
| finnova-13-test-generator-agent | agents | 0.67 | 0.59 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated tests from user stori... |
| finnova-14-rag-quality-gate | agents | 0.50 | 1.00 | PASS | Agent 3 - RAG Quality Gate is designed to validate LLM-powered customer support responses against th... |
| finnova-15-red-team-vulns | agents | n/a | 0.17 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, here are the best practices for test data isolation in Playwright:  1... |
| concept-02-prompt-injection-types | best-practices | 0.00 | 0.00 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| concept-03-rag-hallucination | best-practices | n/a | 0.96 | PASS | Based on the provided context, here’s how you can measure and prevent hallucinations in RAG (Retriev... |
| concept-04-page-object-model | best-practices | 0.88 | 0.98 | PASS | The context explains that the **classic Page Object Model (POM)** tends to collapse under complex Si... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, here are the key principles for designing **LLM-as-a-Judge evaluation... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.90 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 1.00 | 0.97 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a **multi-... |
| concept-09-ci-quality-gates | best-practices | 0.77 | 0.96 | PASS | Based on the provided context, here are the key **quality gates** that should be in place for **AI/L... |
| concept-10-red-teaming-methodology | best-practices | 0.91 | 0.89 | PASS | The methodology for AI red teaming, as described in the provided context, involves systematically ta... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 0.00 | 0.00 | PASS | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |