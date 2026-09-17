import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * The LLM that drives Scenario's user-simulator and judge agents.
 *
 * This is the *evaluator* model and is completely separate from the agent under
 * test (the deployed voice assistant). It needs solid tool-calling (the judge
 * emits a structured finish_test verdict). Preference order picks the key that
 * CI and developer eval runs use the local BossGame/Ollama gateway only.
 * Override the model id with SCENARIO_JUDGE_MODEL.
 *
 * OpenAI-compatible providers use the Chat Completions API (`.chat()`): the AI
 * SDK default (Responses API) is not available on every compatible endpoint.
 */
export function judgeModel(): LanguageModel {
  const override = process.env.SCENARIO_JUDGE_MODEL;
  const baseURL = process.env.LOCAL_LLM_BASE_URL;
  if (!baseURL) throw new Error("Scenario needs the local evaluator. Set LOCAL_LLM_BASE_URL.");
  const p = createOpenAI({
    apiKey: process.env.LOCAL_LLM_API_KEY || "ollama",
    baseURL,
    headers: {
      "X-LLM-Job-ID": process.env.GITHUB_RUN_ID || "local-scenario",
      "X-LLM-Model": process.env.LOCAL_LLM_UPSTREAM_MODEL || "gpt-oss:120b",
    },
  });
  return p.chat(override || "gpt-oss:120b");
}

/** True when at least one evaluator LLM key is present. */
export function hasJudgeModel(): boolean {
  return Boolean(process.env.LOCAL_LLM_BASE_URL);
}
