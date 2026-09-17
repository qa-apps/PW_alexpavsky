import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * The LLM that drives Scenario's user-simulator and judge agents.
 *
 * This is the *evaluator* model and is completely separate from the agent under
 * test (the deployed voice assistant). It needs solid tool-calling (the judge
 * emits a structured finish_test verdict). Preference order picks the key that
 * is both present and reliable here. CI uses the local BossGame Ollama gateway;
 * cloud providers remain available only for explicit developer runs. Override the model id with
 * SCENARIO_JUDGE_MODEL, or force a provider with
 * SCENARIO_JUDGE_PROVIDER=local|groq|openrouter|openai|google.
 *
 * OpenAI-compatible providers use the Chat Completions API (`.chat()`): the AI
 * SDK default (Responses API) is not available on every compatible endpoint.
 */
export function judgeModel(): LanguageModel {
  const override = process.env.SCENARIO_JUDGE_MODEL;
  const forced = (process.env.SCENARIO_JUDGE_PROVIDER || "").toLowerCase();

  const local = () => {
    const p = createOpenAI({
      apiKey: process.env.LOCAL_LLM_API_KEY || "ollama",
      baseURL: process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:11434/v1",
      headers: {
        "X-LLM-Job-ID": process.env.GITHUB_RUN_ID || "local-scenario",
        "X-LLM-Model": process.env.LOCAL_LLM_UPSTREAM_MODEL || "gpt-oss:120b",
      },
    });
    return p.chat(override || "gpt-oss:120b");
  };

  const groq = () => {
    const p = createOpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    // Groq retired the llama-3.x ids for this account; gpt-oss-120b supports tool calls.
    return p.chat(override || "openai/gpt-oss-120b");
  };
  const openrouter = () => {
    const p = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return p.chat(override || "openai/gpt-oss-120b");
  };
  const openai = () => {
    const p = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    return p.chat(override || "gpt-4o-mini");
  };
  const google = () => {
    const p = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return p(override || "gemini-2.5-flash");
  };

  if (forced === "local" && process.env.LOCAL_LLM_BASE_URL) return local();
  if (forced === "groq" && process.env.GROQ_API_KEY) return groq();
  if (forced === "openrouter" && process.env.OPENROUTER_API_KEY) return openrouter();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return openai();
  if (forced === "google" && process.env.GEMINI_API_KEY) return google();

  if (process.env.LOCAL_LLM_BASE_URL) return local();
  if (process.env.GROQ_API_KEY) return groq();
  if (process.env.OPENROUTER_API_KEY) return openrouter();
  if (process.env.OPENAI_API_KEY) return openai();
  if (process.env.GEMINI_API_KEY) return google();

  throw new Error(
    "Scenario needs an evaluator LLM. Set LOCAL_LLM_BASE_URL, GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.",
  );
}

/** True when at least one evaluator LLM key is present. */
export function hasJudgeModel(): boolean {
  return Boolean(
    process.env.LOCAL_LLM_BASE_URL ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}
