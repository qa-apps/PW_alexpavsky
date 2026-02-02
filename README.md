# PW_alexpavsky

Playwright-only end-to-end coverage for the live [alexpavsky.com](https://www.alexpavsky.com) experience.

The application source of truth lives in the separate site repo:

- [alexpavsky](/Users/alexp/Projects/alexpavsky)

This repo intentionally contains only Playwright-related code:

- specs
- fixtures
- page objects
- test utilities
- Playwright config
- CI workflow

## Commands

```bash
npm test
npm run test:headed
npm run test:chromium
```

## GitHub Actions CI

This repo can run Playwright in GitHub Actions on:

- every push to `master`
- every pull request into `master`
- manual runs via `workflow_dispatch`
- nightly at `10:00 PM` New York time

Required repository secret for Slack notifications:

- `SLACK_WEBHOOK_URL`

Optional repository secrets for live LLM judge runs:

- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`

The nightly schedule is implemented with two UTC cron entries and a New York
time gate so it stays aligned with `10:00 PM` across DST changes.

## Playwright MCP

This project includes `@playwright/mcp` so the browser can be attached to an AI orchestrator or agent client for live DOM inspection.

Run the local MCP server:

```bash
npm run mcp:playwright
```

Example Codex MCP config:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["playwright-mcp", "--headless", "--browser", "chrome", "--output-dir", ".playwright-mcp", "--save-trace", "--save-session"]
```

## PromptFoo AI Evaluation

PromptFoo runs standalone LLM evaluations against the chatbot assistant, covering safety, jailbreak resistance, prompt leak protection, tone, and more.

```bash
npm run eval
npm run eval:view
```

Config: `promptfooconfig.yaml`

Custom LLM judges for Playwright integration: `utils/llm-judges.ts`

Available judges: `safety`, `promptLeak`, `jailbreak`, `relevance`, `tone`, `piiProtection`

## Coverage Areas

- Hero ticker and navigation
- Live feed filters and article modal
- Essential Principles and tooling sections
- AI Lab tools and challenge playground
- AI assistant UI and LLM-as-a-judge checks
- YouTube/video carousel
- Responsive navigation and newsletter digest flow
