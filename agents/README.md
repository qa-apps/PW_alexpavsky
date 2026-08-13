# Agents & skills (PW_alexpavsky)

Single home for **agent prompts** and **test-automation practice notes** used by
Claude / VS Code / local ops scripts. Source of truth lives here — not scattered
across the repo root or tool-specific folders (`.devin`, root `*.agent.md`).

## Layout

```
agents/
  *.agent.md              # agent prompts (planner, generator, healer, triage, …)
  playwright-mcp.md       # how to run Playwright MCP for live DOM inspection
  skills/                 # reusable practices (not full agent personas)
  README.md               # this file

.claude/agents/           # thin symlinks → agents/*.agent.md for `claude --agent`
.github/agents/           # GitHub Copilot agents (owned by GitHub / Playwright
                          # init-agents). Do not edit from this reorg.
```

## Agents

| File | Role |
|------|------|
| `playwright-test-planner.agent.md` | Plan coverage for a flow / page |
| `playwright-test-generator.agent.md` | Write Playwright specs from a plan |
| `playwright-test-healer.agent.md` | Debug and fix a failing test |
| `playwright-test-triage.agent.md` | Classify failures: site bug vs test vs env |
| `playwright-weekly-report.agent.md` | Weekly QA summary |
| `auto-fix.agent.md` | CI failure → patch tests → open PR (no app code) |

Run via Claude CLI (name matches frontmatter `name:`):

```bash
claude --agent playwright-test-triage --print "…"
./ops/run-triage.sh
./ops/run-weekly-report.sh
```

## Skills

| File | Use when |
|------|----------|
| `skills/test-automation.md` | Suite structure, tags, CI gates, what not to test here |
| `skills/playwright-practices.md` | Locators, waits, POM, flake-resistant patterns |
| `skills/triage-and-flakes.md` | Failure classification and flake playbook |

## What is *not* here

- **`AGENTS.md` (repo root)** — daily live-site QA loop contract (Codex + Claude).
  Stays at root so tools that look for `AGENTS.md` keep finding it.
- **`CLAUDE.md` (repo root)** — Claude Code project instructions. Stays at root.
- **`.github/`** — CI workflows, Copilot agents, notify scripts. Leave alone.
- **`.vscode/mcp.json`** — VS Code MCP server config for `playwright-test`.
- **App source** — lives in `/Users/alexp/Projects/alexpavsky`. This repo is tests only.
