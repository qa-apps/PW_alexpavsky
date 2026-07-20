# AGENTS.md — daily alexpavsky.com QA loop

This file is the **contract for the daily live-site QA loop** on
**https://www.alexpavsky.com**. Codex runs the test pass; Claude clears blockers
and applies functional fixes; Codex signs off. Both agents speak to the report
through **one library** so the schema never drifts.

> Site source is a **separate** repo (`/Users/alexp/Projects/alexpavsky`). This
> repo is tests + the QA loop only — never edit application code from here.

## Where reports live now (NOT the Desktop)

Daily reports are **no longer written to the Desktop** (`/Users/alexp/Desktop/REPORTS/...`).
The Codex runner sandbox blocks that write with `EPERM` anyway. Instead, each day
is one JSON file under `qa-report-ui/reports/<YYYY-MM-DD>.json`, surfaced in a tiny
local web UI:

```bash
cd qa-report-ui && python3 serve.py     # -> http://127.0.0.1:5058
```

Open that URL to see the list of days and click a day for the full report
(blockers, bugs found/fixed/verified, final verdict). It is pure Python stdlib —
nothing to install.

**The report auto-opens in Alex's browser at each milestone.** Every `status`
transition to `blocked`, `codex_verifying`, or `complete` pops that day's report
open in the default browser (and starts `serve.py` if it isn't already running) —
so Alex sees the result right after a run, a fix, or a verification without being
told a URL. If your runner is headless and must not spawn a browser, export
`QA_UI_NO_OPEN=1` for that process; the report still saves exactly the same.

**Never write a report JSON by hand.** Always go through the CLI below; it
validates before every save and refuses to persist anything off-schema.

## The loop and who holds the report

Each report moves through a state machine on its `status` field:

| `status`          | Holder         | Action                                                                 |
|-------------------|----------------|------------------------------------------------------------------------|
| `codex_testing`   | **Codex**      | Daily live pass. File every defect as a bug. Add a blocker if you can't test. |
| `blocked`         | Codex → Claude | The run couldn't complete. Hand to Claude to clear the blocker.         |
| `claude_fixing`   | Claude         | Clears each blocker; applies the **functional** fix per bug; records `claude_fix`. |
| `codex_verifying` | **Codex**      | Re-test each fix live; write a per-bug `codex_verdict`.                 |
| `complete`        | **Codex**      | Write `codex_final` — the verdict Alex reads.                           |

The UI's flow strip mirrors these four steps so Alex can see at a glance whose
court the ball is in.

## Codex — phase 1: the daily test pass

Run the preflight (DNS + Chromium) first, exactly as today. Then:

```bash
cd qa-report-ui

# 1. open the day (idempotent — re-opening keeps existing data)
python3 report_lib.py new 2026-06-15 --tester codex \
  --headline "Daily live pass of www.alexpavsky.com"

# 2a. HAPPY PATH — the live pass ran. File each defect you found:
python3 report_lib.py add-bug 2026-06-15 --id codex-e2e-2026-06-15-001 \
  --title "YouTube thumbnail fails to load in carousel" \
  --section "Live feed" --severity major \
  --codex-status found \
  --evidence "screenshot: carousel-thumb-404.png" --evidence "naturalWidth=0 after load"
# ... one add-bug per defect. Then:
python3 report_lib.py status 2026-06-15 codex_verifying    # straight to verify if nothing blocked you

# 2b. BLOCKED PATH — preflight failed (the usual sandbox case). Record the
#     blocker(s) from the preflight JSON, then hand to Claude:
python3 report_lib.py blocker 2026-06-15 env-dns open \
  --title "DNS ENOTFOUND for www.alexpavsky.com" \
  --detail "getaddrinfo ENOTFOUND — runner has no egress to resolve the host"
python3 report_lib.py blocker 2026-06-15 env-chromium open \
  --title "Chromium headless shell won't launch" \
  --detail "browserType.launch: Target page/context/browser has been closed"
python3 report_lib.py status 2026-06-15 blocked            # Claude takes it from here
```

Map your existing artifacts straight onto the CLI:
- `qa-history/codex-env-preflight-<date>.json` → `checks.dns.ok=false` becomes the
  `env-dns` blocker; `checks.browser.ok=false` becomes the `env-chromium` blocker.
- `qa-history/codex-e2e-defects.json` `defects[]` → one `add-bug` each.

Keep writing those `qa-history/` files too — they remain the raw audit trail. The
report is the **human-facing rollup** layered on top.

## Codex — phase 2: verify Claude's fixes

When `status == codex_verifying`, Claude has cleared the blocker and recorded a
`claude_fix` per bug. Re-test each one **live** and record a verdict:

```bash
cd qa-report-ui
python3 report_lib.py verdict 2026-06-15 codex-e2e-2026-06-15-001 fixed \
  --note "retested live @1440 + @390 — thumbnail loads, naturalWidth=480"
python3 report_lib.py verdict 2026-06-15 codex-e2e-2026-06-15-002 needs_attention \
  --note "still reproduces on iOS Safari 390px"

# then the final verdict Alex reads:
python3 report_lib.py final 2026-06-15 all_clear \
  --summary "All 7 functional fixes verified live. Site is clean."
# or, if something still needs Alex:
python3 report_lib.py final 2026-06-15 attention_needed \
  --summary "6/7 fixed; bug 002 still open on mobile." \
  --needs-alex codex-e2e-2026-06-15-002

python3 report_lib.py status 2026-06-15 complete
```

Per-bug verdicts: `fixed`, `needs_attention`, `not_reproduced`, `pending`.
Final verdicts: `all_clear`, `attention_needed`, `pending`.

## Screenshots — attach evidence to every bug AND every fix

Alex reads the report visually. **Every bug should carry at least one screenshot,
and every fix should carry one too** — a small thumbnail he can click to expand
full-screen in the UI (a built-in lightbox handles the zoom). Either agent may
attach them: Codex attaches `--kind bug` evidence while testing; Claude (or Codex
on re-verify) attaches `--kind fix` proof of the corrected behavior.

```bash
cd qa-report-ui

# Codex, phase 1 — capture the defect, then attach it to the bug as evidence.
# --file copies an image from anywhere on disk into shots/<date>/ for you:
python3 report_lib.py add-shot 2026-06-15 codex-e2e-2026-06-15-001 \
  --file qa-history/shots/carousel-thumb-404.png \
  --kind bug --caption "Carousel thumbnail 404s — naturalWidth=0 @1440"

# Claude / Codex re-verify — attach proof the fix works:
python3 report_lib.py add-shot 2026-06-15 codex-e2e-2026-06-15-001 \
  --file /tmp/livefeed-fixed.png \
  --kind fix --caption "Retested live @1440 — thumbnail loads, naturalWidth=480"
```

`--file <path>` imports the file into `shots/<date>/` and records the relative
path. Use `--src <relpath>` only if the image is **already** under `shots/<date>/`.
Captions should state the viewport + the observation, same standard as a verdict
note. Bug-evidence thumbnails appear in the "Codex found" cell; fix thumbnails in
the "Claude's fix" cell — both click to expand.

## Design vs. functional — the hard rule (applies to BOTH agents)

- **Functional** defects (broken behavior, JS/console errors, 4xx/5xx, wrong data,
  dead controls, overflow that breaks layout function) → Claude may fix
  autonomously, then verify in a real browser.
- **Design** decisions (spacing, colour, typography, sizing, footer/header
  structure, modal styling, visual hierarchy) → **never** touched by an agent.
  Escalate to the owner via Slack `#bug-reports` and leave it for Alex.
- **Unsure which it is → treat it as design → escalate, don't touch.**

When Codex files a design-only observation, mark its severity `cosmetic` and say
so in the evidence so Claude routes it to Slack instead of "fixing" it.

## Never claim a fix works until it's observed in a real browser

`claude_fix.verified` and every Codex `verdict` note must describe an **actual
observation** — the viewport and the action that proved it (e.g. "live @390px,
opened Digest modal, scrollY=0"), never "the code looks right" or "deployed". A
carried-forward classification must say it was carried forward.

## Write it tight — brevity (applies to BOTH agents)

Alex scans this report every day; every wasted word costs him time. Write so the
problem is obvious at a glance. Shorten anything that can be shortened — but never
drop a load-bearing fact (a measurement, a root cause, a repro) just to be short.

- **Headline = one line** (≤120 chars), the day's bottom line, result first. Not a
  paragraph. ✗ "Codex's daily run was sandbox-blocked (DNS + Chromium). Claude
  cleared the blocker with a full live pass…" → ✓ "Codex sandbox-blocked; Claude's
  live pass verified 7/7 fixes, 0 new defects. Codex sign-off pending."
- **Bug title = the symptom in ≤10 words**, present tense, no "the/a"
  ("390px viewport shows horizontal overflow"). The title *is* the bug.
- **One scannable line per cell** — `evidence`, `claude_fix.summary`, `verified`,
  each verdict note. Two facts → two short clauses, not two sentences of narration.
- **Lead with the result; cut the preamble.** State status plainly — `verified` /
  `not retested` / `by-design`. ✗ "Addressed in 90e2fdb; carried forward pending a
  fresh 390px live retest." → ✓ "Fixed (90e2fdb); live @390px scrollWidth 390==390."
- **A number or a path beats prose**: `0/52 empty headings`, `scrollWidth==clientWidth`.
- **Don't repeat across columns.** Commit + files already render as chips — don't
  restate them in prose. Found / fix / verdict each add NEW information.
- **No hedging or process narration** — drop "classification carried forward
  pending…", "though the web fetcher can still…", "targeting the … pattern".
- **Final summary ≤2 sentences**: result first, then what's left for Alex.

## CLI reference (full surface)

```
new <date> [--site --tester --headline]      create / re-open a day
list                                          one line per report
validate <date|file>                          schema-check a report
status <date> <status>                        move along the loop
headline <date> <text>                        update the one-line headline
blocker <date> <id> <state> [--title --detail --note --commit]
add-bug <date> --id --title [--section --severity --codex-status --evidence ...]
add-shot <date> <bug> (--file <path> | --src <relpath>) [--caption --kind bug|fix]
claude-fix <date> <bug> --summary [--commit --files --verified --not-done]
verdict <date> <bug> <verdict> [--note]
final <date> <verdict> [--summary --needs-alex ...]
```

`status`: `codex_testing` `blocked` `claude_fixing` `codex_verifying` `complete`.
`blocker` state: `open` `claude_cleared` `resolved_by_design`.
`severity`: `major` `minor` `cosmetic`. `codex-status`: `found` `confirmed` `not_reproduced`.
`add-shot` `--kind`: `bug` (evidence of the defect) or `fix` (proof it's resolved).

See `qa-report-ui/README.md` for the same flow from Claude's side.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
