# PW_alexpavsky — Claude Code instructions

End-to-end Playwright suite for the live site **https://www.alexpavsky.com**.
The site source lives in a **separate** repo: `/Users/alexp/Projects/alexpavsky`.
This repo contains tests only — never edit application code from here.

## Stack

- **Playwright** (`@playwright/test`) — TypeScript, single `chromium` project, `baseURL = https://www.alexpavsky.com`
- **Promptfoo** — standalone LLM evals for the site's chatbot (`promptfooconfig.yaml`, judges in `utils/llm-judges.ts`)
- **k6** — performance scenarios in `performance/site.js`
- **Python eval tools** in `eval/` — Giskard, RAGAS, rotating-LLM helpers (separate `requirements.txt`)
- **Playwright MCP** (`@playwright/mcp`) — agent-driven DOM inspection

## Layout

```
tests/         specs (+ smoke/, llm-judge/, rag/, regex/ subfolders)
pages/         Page Object Model classes (HomePage, AuthPage, ChatbotPage, …)
utils/         fixtures.ts, llm-judges.ts, verdict-reporter.ts, model-registry.ts
performance/   k6 scripts
eval/          Python-based LLM eval scripts (Giskard, RAGAS)
scripts/       provider refresh/ping (ts-node), build_eval_site.py
judge-verdicts/  generated LLM judge verdict reports (do not hand-edit)
```

## Common commands

```bash
npm test                          # full suite
npm run test:smoke                # smoke only, workers=1
npm run test:chromium             # explicit chromium project
npm run test:debug                # Playwright inspector
npm run test:ui                   # tests/loginDashboard.spec.ts (single-worker)
npm run test:security             # securityVulnerability.spec.ts (single-worker)
npm run report                    # open last HTML report
npm run performance               # k6 default scenario
npm run eval                      # promptfoo eval, no cache, concurrency=1
npm run eval:view                 # promptfoo viewer
npm run providers:ping            # check LLM provider keys are live
```

## Running a single test

```bash
npx playwright test tests/auth.spec.ts            # by file
npx playwright test -g "requires auth"            # by test name pattern
npx playwright test tests/auth.spec.ts --debug    # with inspector
npx playwright test tests/auth.spec.ts --headed   # see the browser
npm run test:smoke -- -g "footer"                 # smoke + name filter
```

## Flaky test triage

- Replace `waitForTimeout(N)` with `locator.waitFor({ state: 'visible' })` or a state assertion (`expect(locator).toBeVisible()`).
- Avoid `waitForLoadState('networkidle')` on this site — the chat widget and analytics keep network alive and the wait can hang. Use `'domcontentloaded'` + element waits instead.
- Current hotspots: `tests/live-rail.spec.ts` (~11 `waitForTimeout` calls) and `tests/smoke/smoke-ui.spec.ts`. Fix these before adding similar patterns elsewhere.
- For intermittent CI failures, check the trace via `npm run report` and look for `recordings/.last-run.json` timing data.

## POM rules

- Repeating selectors belong in `pages/`, never inline in specs. Repeated offenders today: `#liveHandle`, `#liveRail`, `#chat-toggle-btn`.
- Missing POM classes worth creating when touched: `LiveRailPage`, `FeedPage`, `NoveltyBarPage`.
- New specs must import a POM from `pages/` — no fresh `page.locator()` chains in test bodies.

## CI: what blocks merges, what doesn't

- `.github/workflows/playwright-ci.yml` — deterministic tests, **blocks PR merges**.
- `.github/workflows/llm-quality.yml` — LLM-judge tests, `continue-on-error: true`, **informational only** (free-tier judges are rate-limited and noisy).
- Split is by name: deterministic = everything not matching `grep "LLM Judge"`.
- If a deterministic test goes flaky, prefer disabling the assertion locally and opening an issue over moving it to llm-quality.

## Generated artifacts — don't hand-edit

- `judge-verdicts/<run-id>/*.json` — written by `npm run eval` and CI
- `test-results/`, `playwright-report/`, `recordings/.last-run.json`
- `.playwright-report-temp/` — CI scratch space

Stale reports mislead future runs — let the tooling regenerate them.

## Local `.env` — what's actually required

For UI / security / feed / smoke specs: no keys needed.
For `npm run eval` and LLM-judge specs: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`.
For Slack notifications from CI only: `SLACK_WEBHOOK_URL`.
Run `npm run providers:ping` to verify keys before a judge run.

## Conventions

- Add new tests under `tests/` matching existing topic split (chatbot, feed, security, lab-tools, mobile-responsive, …). Use POM classes from `pages/` instead of raw selectors in specs.
- Single chromium project — don't add browsers/devices without asking.
- Tests run against **production**. No staging URL. Don't write specs that mutate site state or hit rate-limited endpoints aggressively.
- Promptfoo runs with `--max-concurrency 1` on purpose (judge LLMs are rate-limited). Don't bump it.
- Judge verdicts in `judge-verdicts/` are generated artifacts — they may be committed, but Claude should not author them by hand.
- CI runs on push to `master`, PRs into `master`, manual dispatch, and nightly at 10pm New York time (two UTC crons + NY gate for DST).

## Secrets

`.env` is loaded by `playwright.config.ts` via `dotenv`. Required for live LLM judge runs: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`. Slack notifications need `SLACK_WEBHOOK_URL`. Never commit `.env` or echo key values.

## When changing application behavior

If a test fails because the site changed, fix the test here. If the site itself is broken, the fix belongs in `/Users/alexp/Projects/alexpavsky` — flag it, don't try to patch it from this repo.
