import { defineConfig } from "vitest/config";

/**
 * Vitest runs the agent-quality checks (LangWatch Scenario for voice, Langfuse
 * for the chat agent). Playwright specs stay on the Playwright runner — these
 * two runners do not overlap.
 */
export default defineConfig({
  test: {
    include: ["tests/voice/**/*.test.ts", "tests/observability/**/*.test.ts"],
    setupFiles: ["tests/support/loadEnv.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    watch: false,
  },
});
