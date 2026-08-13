import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * The LLM that drives Scenario's user-simulator and judge agents.
 *
 * This is the *evaluator* model and is completely separate from the agent under
 * test (the deployed voice assistant). It needs solid tool-calling (the judge
 * emits a structured finish_test verdict). Preference order picks the key that
 * is both present and reliable here: Groq first (fast, strong tool-calling),
 * then OpenAI, then Gemini. Override the model id with SCENARIO_JUDGE_MODEL, or
 * force a provider with SCENARIO_JUDGE_PROVIDER=groq|openai|google.
 */
export function judgeModel(): LanguageModel {
  const override = process.env.SCENARIO_JUDGE_MODEL;
  const forced = (process.env.SCENARIO_JUDGE_PROVIDER || "").toLowerCase();

  const groq = () => {
    const p = createOpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    return p(override || "llama-3.3-70b-versatile");
  };
  const openai = () => {
    const p = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    return p(override || "gpt-4o-mini");
  };
  const google = () => {
    const p = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return p(override || "gemini-2.5-flash");
  };

  if (forced === "groq" && process.env.GROQ_API_KEY) return groq();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return openai();
  if (forced === "google" && process.env.GEMINI_API_KEY) return google();

  if (process.env.GROQ_API_KEY) return groq();
  if (process.env.OPENAI_API_KEY) return openai();
  if (process.env.GEMINI_API_KEY) return google();

  throw new Error(
    "Scenario needs an evaluator LLM. Set GROQ_API_KEY (preferred), OPENAI_API_KEY, or GEMINI_API_KEY.",
  );
}

/** True when at least one evaluator LLM key is present. */
export function hasJudgeModel(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}
