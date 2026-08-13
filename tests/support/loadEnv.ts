// Vitest setup: load .env so Scenario/LangWatch/Langfuse keys are available.
// Playwright specs load env their own way; this only affects the vitest suites.
import "dotenv/config";
