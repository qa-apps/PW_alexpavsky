# Ragas Evaluation Report

_Generated: 2026-05-20T22:53:21.659851+00:00_


## Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Average faithfulness    | 0.779 | ≥ 0.65 | PASS |
| Average answer_relevancy | 0.610 | ≥ 0.55 | PASS |
| Keyword check pass rate | 66.7% | ≥ 60% | PASS |
| Questions evaluated     | 27 | — | — |
| Judge model             | `groq/llama-3.3-70b-versatile (+7 fallbacks)` | — | — |

## Per-Question Results

| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |
|---|---|---|---|---|---|
| finnova-01-agent-count | facts | 1.00 | 0.91 | PASS | According to the provided context, **7 specialized AI agents** were deployed at FinNova Bank as part... |
| finnova-02-bug-reduction | metrics | 1.00 | 1.00 | PASS | Production bugs at FinNova Bank dropped by **67%**.  (From the context: "Production P1/P2 bugs per m... |
| finnova-03-cost-savings | metrics | 1.00 | 0.81 | PASS | Based on the provided context, FinNova saved **$2.4 million annually** in operating costs after depl... |
| finnova-04-mttd | metrics | 1.00 | 0.39 | PASS | Before: 4 hours 30 minutes After: 12 minutes... |
| finnova-05-test-cases | facts | 1.00 | 0.93 | PASS | The Test Generator agent (Agent 1) produced **3,247 automated test cases** over 12 months, as stated... |
| finnova-06-flake-rate | metrics | 1.00 | 0.00 | FAIL | The context does not provide specific numerical values for the flake rate before and after the engag... |
| finnova-07-customers | facts | 1.00 | 1.00 | PASS | FinNova Bank serves **2.4 million retail customers**.... |
| finnova-08-transaction-volume | facts | 0.00 | 0.06 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-09-locations | facts | 0.00 | 0.09 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-10-black-friday | incidents | 0.00 | 0.30 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-11-march-incident | incidents | 1.00 | 0.00 | FAIL | The context does not provide specific information about an incident prevented by the Red Team Bot on... |
| finnova-12-kafka-incident | incidents | 0.00 | 0.37 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| finnova-13-test-generator-agent | agents | 0.71 | 0.59 | PASS | The **Test Generator** agent (Agent 1) is responsible for generating automated tests from user stori... |
| finnova-14-rag-quality-gate | agents | 0.87 | 0.39 | PASS | Based on the provided context, **Agent 3 - RAG Quality Gate** is responsible for validating LLM-powe... |
| finnova-15-red-team-vulns | agents | 1.00 | 0.98 | PASS | The Red Team Bot caught **47 high-severity vulnerabilities** before production.... |
| concept-01-test-isolation | best-practices | n/a | 0.03 | FAIL | LLM unavailable — all providers failed. Last error: hf-router/meta-llama/Llama-3.3-70B-Instruct:cere... |
| concept-02-prompt-injection-types | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the main categories of prompt injection attacks that QA should test f... |
| concept-03-rag-hallucination | best-practices | 1.00 | 0.96 | PASS | Based on the provided context, hallucinations in RAG (Retrieval-Augmented Generation) systems can be... |
| concept-04-page-object-model | best-practices | 0.94 | 0.97 | PASS | The **classic Page Object Model (POM)** tends to create large, monolithic page objects that encapsul... |
| concept-05-llm-judge-principles | best-practices | 1.00 | 1.00 | FAIL | Based on the provided context, the key principles when designing LLM-as-a-judge evaluation framework... |
| concept-06-mcp-architecture | best-practices | 1.00 | 0.87 | PASS | The **Model Context Protocol (MCP)** is an open-standard architecture designed to standardize contex... |
| concept-07-flakiness-reduction | best-practices | 1.00 | 1.00 | PASS | Based on the provided context, the most effective strategies for reducing test flakiness in Playwrig... |
| concept-08-kafka-validation | best-practices | 0.73 | 0.98 | PASS | To test event-driven systems with Kafka in distributed environments, the context outlines a multi-la... |
| concept-09-ci-quality-gates | best-practices | 1.00 | 0.96 | PASS | Based on the provided context, here are the key **quality gates** that should be in place for AI/LLM... |
| concept-10-red-teaming-methodology | best-practices | 1.00 | 0.89 | PASS | The methodology for AI red teaming, as described in the context, focuses on systematically identifyi... |
| negative-01-no-info | refusal | 0.67 | 0.00 | PASS | The provided context does not contain any information about FinNova Bank's CEO or their favorite col... |
| negative-02-fabrication | refusal | 0.33 | 0.00 | FAIL | The context does not provide information about the number of employees from Anthropic who worked on ... |