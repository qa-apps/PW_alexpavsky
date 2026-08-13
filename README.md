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

```bash
npm run mcp:playwright
```

How-to and agent prompts live under **`agents/`** (see `agents/README.md` and
`agents/playwright-mcp.md`). VS Code MCP server config: `.vscode/mcp.json`.

Example MCP config for other clients:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["playwright-mcp", "--headless", "--browser", "chrome", "--output-dir", ".playwright-mcp", "--save-trace", "--save-session"]
```

## Agents & skills

| Path | Purpose |
|------|---------|
| `agents/*.agent.md` | Planner / generator / healer / triage / weekly / auto-fix prompts |
| `agents/skills/` | Test-automation and Playwright practice notes |
| `.claude/agents/` | Symlinks for `claude --agent <name>` |
| `.github/agents/` | GitHub Copilot agents (leave for Copilot / `playwright init-agents`) |

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

## Artifact layout

| Path | What |
|------|------|
| `test-results/recordings/` | Playwright screenshots / video / trace (per test) |
| `test-results/daily/` | Daily live-QA evidence (images + probe JSON) |
| `playwright-report/` | HTML report UI — `npm run report` |
| `k6/site.js` + `k6/results/` | Performance script + run summaries |
| `qa-report-ui/` | Daily structured QA report app (`python3 serve.py` → :5058) |

All of the above except scripts under `k6/` and `qa-report-ui/*.py` are gitignored runtime data.

