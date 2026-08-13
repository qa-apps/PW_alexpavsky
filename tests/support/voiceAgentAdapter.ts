import type { AgentAdapter } from "@langwatch/scenario";
import { AgentRole } from "@langwatch/scenario";

/**
 * Scenario adapter for the LIVE voice assistant that powers the orb widget on
 * alexpavsky.com.
 *
 * The voice pipeline is stt -> brain -> tts. The brain's text-in/text-out door
 * is `/voice-api/api/say` (the same brain the audio `/api/turn` path uses), so
 * we exercise the assistant's actual answering behaviour without needing to
 * synthesize audio. That keeps this a check of the deployed agent — not a mock.
 *
 * Override the target with VOICE_AGENT_SAY_URL (e.g. to hit a local server.py).
 */
const SAY_URL =
  process.env.VOICE_AGENT_SAY_URL || "https://alexpavsky.com/voice-api/api/say";

function lastUserText(messages: readonly any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const text = m.content
        .filter((p: any) => p?.type === "text")
        .map((p: any) => p.text)
        .join(" ")
        .trim();
      if (text) return text;
    }
  }
  const last = messages[messages.length - 1];
  return typeof last?.content === "string" ? last.content : "";
}

export function voiceAgent(): AgentAdapter {
  return {
    role: AgentRole.AGENT,
    call: async (input) => {
      const text = lastUserText(input.messages as any[]);
      const res = await fetch(SAY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, session_id: `scenario-${input.threadId}` }),
      });
      if (!res.ok) {
        throw new Error(`voice /api/say HTTP ${res.status}: ${await res.text()}`);
      }
      const data: any = await res.json();
      // Deployed brain returns { answer, spoken, ... }; prefer the spoken form
      // (what the user actually hears), fall back to the full answer.
      const reply = (data.spoken || data.answer || data.reply || "").trim();
      if (!reply) {
        throw new Error(`voice /api/say returned no answer: ${JSON.stringify(data)}`);
      }
      return reply;
    },
  };
}

export { SAY_URL };
