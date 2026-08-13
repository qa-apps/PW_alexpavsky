# Failure triage & flake playbook

Use when CI or a local run is red and you need a **fast, correct** call:
site bug vs broken test vs environment.

Agent entry points: `playwright-test-triage`, then `playwright-test-healer` for
test fixes only. Site bugs go to the site repo / owner — not silent test softening.

## Classification

| Label | Meaning | Action |
|-------|---------|--------|
| **SITE BUG** | Product behavior wrong vs intended | Report (Slack bug-reports / issue); leave test failing or `test.fixme` with reason |
| **TEST ISSUE** | Selector, wait, data setup, assertion drift | Fix the test; re-run until green |
| **ENV ISSUE** | Rate limit, network, missing secret, third-party outage | Retry / skip with reason; do not “fix” by weakening the check |
| **DESIGN** | Layout, spacing, colour, screenshot baseline | **Never auto-fix.** Escalate to owner |

When unsure between SITE BUG and DESIGN → treat as **DESIGN** / escalate.

## Triage steps

1. Open the latest HTML report / trace (`npm run report`, `test-results/`).
2. Reproduce the single failing test headed or with `--debug`.
3. Snapshot the live UI (Playwright MCP or headed run) at the failing step.
4. Decide classification **before** editing code.
5. If TEST ISSUE → healer loop (one failure at a time, re-run after each fix).
6. Write a short note under `judge-verdicts/triage-YYYY-MM-DD.md` when useful
   for the weekly report.

## Flake patterns on this site

| Symptom | Likely cause | Fix direction |
|---------|--------------|---------------|
| Timeout on chat / feed | `networkidle` or short fixed sleep | Element-state waits; avoid networkidle |
| Intermittent live rail / ticker | Animation + auto-scroll | Wait for a stable child; avoid depending on exact scroll position |
| LLM judge red only | Free-tier / model variance | Keep under `@llm-judge`; do not gate merges on it |
| Auth random fail | Session / cookie race | Use project auth helper; assert post-login landmark |
| Design screenshot drift | Font / subpixel / content change | Owner review — no baseline auto-update in agents |

## Healer guardrails

- Fix **one** root cause, then re-run.
- Prefer robust locators over more waits.
- No `waitForTimeout` as a permanent patch.
- If the test is correct and the product is wrong → `test.fixme('…why…')` plus
  a comment; do not greenwash.
- Never edit `/Users/alexp/Projects/alexpavsky` from this repo’s agents.

## Auto-fix agent extras

- Opens PRs labelled for human review; never merges; never pushes to `master`.
- Skips design failures entirely.
- If confidence is low → skip the run and log why.

## Ops entrypoints

```bash
./ops/run-triage.sh                 # all failures
./ops/run-triage.sh auth.spec.ts    # one spec
./ops/run-weekly-report.sh          # weekly summary agent
```
