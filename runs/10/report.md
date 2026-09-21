# Ragas Evaluation Report

_Generated: 2026-05-20T18:05:35.975853+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.848 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.628 | ≥ 0.55 | PASS |
| Keyword check pass rate | 70.4% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.91 | PASS | According to the provided context, **7 specialized AI agents** were deployed at FinNova Bank as part... |
| finnova-02-bug-reduction | metrics | n/a | 1.00 | PASS | Production bugs at FinNova Bank dropped by **67%**.  (Before: 18.4 P1/P2 incidents per month → After... |
| finnova-03-cost-savings | metrics | 1.00 | 0.81 | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | 1.00 | 0.39 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.94 | PASS | The Test Generator agent produced **3,247 automated test cases** over 12 months.... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific numerical values for the flake rate before and after the engag... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | n/a | 0.06 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-09-locations | facts | n/a | 0.10 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-10-black-friday | incidents | 0.00 | 0.29 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-11-march-incident | incidents | n/a | 0.16 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-12-kafka-incident | incidents | 0.67 | 0.00 | FAIL | The provided context does not contain any information about a "Data Integrity Verifier" or any event... |
| finnova-13-test-generator-agent | agents | 0.80 | 0.59 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated tests from user stori... |
| finnova-14-rag-quality-gate | agents | n/a | 1.00 | PASS | Agent 3 - **RAG Quality Gate** is designed to validate LLM-powered customer support responses agains... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The context states that the **Red Team Bot** caught **47 high-severity vulnerabilities** before prod... |
| concept-01-test-isolation | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, here are the best practices for test data isolation in Playwright:  1... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 0.00 | -0.04 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| concept-04-page-object-model | best-practices | 0.91 | 0.98 | PASS | The key difference between the **classic Page Object Model (POM)** and the **Component-Driven Page O... |
| concept-05-llm-judge-principles | best-practices | n/a | 1.00 | PASS | Based on the provided context, the key principles for designing **LLM-as-a-Judge evaluation framewor... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.94 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 0.79 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 1.00 | 0.98 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a **multi-... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.98 | PASS | Based on the provided context, here are the **quality gates** that should be in place for AI/LLM fea... |
| concept-10-red-teaming-methodology | best-practices | 0.97 | 0.90 | PASS | The methodology for AI red teaming, as outlined in the provided context, focuses on systematically t... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 1.00 | 0.00 | FAIL | Based on the provided context, there is no information about the number of employees from Anthropic ... |