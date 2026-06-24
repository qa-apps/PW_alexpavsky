# alexpavsky.com QA report UI

A tiny, zero-dependency local web UI that lists the **daily website-testing
reports** for [www.alexpavsky.com](https://www.alexpavsky.com), replacing the old
"dump a PDF onto the Desktop" delivery (which the Codex runner sandbox blocks with
`EPERM` anyway).

It is modeled on the local `job-auto` dashboard: open one URL, see the list, click
a day to see the detail.

```
python3 serve.py            # -> http://127.0.0.1:5058
QA_UI_PORT=5060 python3 serve.py
```

Nothing to install — it uses only the Python standard library.

**The report pops open by itself.** After each milestone — the run finishes (clean
or blocked), the fixes are in, or verification completes — the CLI opens that day's
report in your default browser so you see it without hunting for the URL. Concretely
it fires on `status` transitions to `blocked`, `codex_verifying`, and `complete`, and
will start `serve.py` itself if nothing is listening yet. Set `QA_UI_NO_OPEN=1` to
turn it off (CI, headless sandboxes), or `QA_UI_PORT` to match a non-default port.

## What it shows

* **`/`** — one card per daily run (newest first): date, where it is in the loop,
  a one-line headline, and counts (bugs / Claude-fixed / need-you / blockers).
* **`/r/<date>`** — the full report for that day:
  * **Blockers Codex hit** — anything the runner couldn't do (DNS, browser launch,
    a write path), and how it was cleared (by Claude, or removed by design).
  * **Bugs — found, fixed, verified** — a table with exactly the three things that
    matter: what **Codex found**, **Claude's fix**, and **Codex's verdict**. Each
    bug can carry **screenshots** — small thumbnails (bug-evidence in the "found"
    cell, fix-proof in the "fix" cell) that **click to expand full-screen** in a
    built-in lightbox, so the visual proof is right there without bloating the page.
  * **Codex final verdict** — all-clear / your-attention-needed / pending, plus a
    list of anything that still needs Alex.

## The loop (Codex → Claude → Codex)

Each report is one JSON file in [`reports/`](reports/) and moves through a small
state machine on its `status` field:

| `status`          | Who's holding it | What happens                                                            |
|-------------------|------------------|------------------------------------------------------------------------|
| `codex_testing`   | Codex            | Daily live pass. Files `bugs[]`. Adds `blockers[]` if it couldn't test. |
| `blocked`         | Codex → Claude   | The run couldn't complete; Claude is needed to clear the blocker.       |
| `claude_fixing`   | Claude           | Clears each blocker; applies the **functional** fix per bug; records `claude_fix{}`. |
| `codex_verifying` | Codex            | Re-tests each fix; writes a per-bug `codex_verdict`.                    |
| `complete`        | Codex            | Writes `codex_final` (the verdict Alex reads).                          |

**Design vs. functional split (hard rule).** Claude only fixes **functional**
defects (broken behavior, JS/console errors, wrong data, overflow that breaks
layout function, dead controls) and then verifies them in a real browser. Anything
that is a **design** decision (spacing, colour, typography, sizing, footer/header
structure, modal styling, visual hierarchy) is **not** touched — it is escalated to
the owner via Slack `#bug-reports`. When unsure which it is, treat it as design and
escalate.

**Never claim a fix works until it's observed in a real browser.** `claude_fix.verified`
must describe an actual observation (viewport + action), not "the code looks right".
Carried-forward classifications must say so.

**Write it tight.** Alex scans this report every day, so make the problem obvious at a
glance: headline = one result-first line (≤120 chars); bug title = the symptom in ≤10
words; one scannable line per cell (a number or path beats prose); final summary ≤2
sentences, result first. Never drop a load-bearing fact (a measurement, a root cause, a
repro) just to be short. Full rules + before/after examples live in the **"Write it
tight"** section of [`../AGENTS.md`](../AGENTS.md) — both agents follow them.

## Writing reports — always through `report_lib.py`

Both agents mutate reports through the library so the schema never drifts:

```bash
# Codex, start of the daily pass
python3 report_lib.py new 2026-06-15 --tester codex --headline "Daily live pass"
python3 report_lib.py add-bug 2026-06-15 --id codex-e2e-2026-06-15-001 \
  --title "..." --section "Hero" --severity major --evidence "screenshot: ..."
# attach a screenshot of the defect (--file copies it into shots/<date>/):
python3 report_lib.py add-shot 2026-06-15 codex-e2e-2026-06-15-001 \
  --file qa-history/shots/hero-broken.png --kind bug --caption "Hero @1440 — word-join"
python3 report_lib.py blocker 2026-06-15 env-dns open --title "DNS ENOTFOUND" --detail "..."
python3 report_lib.py status 2026-06-15 blocked          # hand to Claude

# Claude, fixing phase
python3 report_lib.py blocker 2026-06-15 env-dns claude_cleared --note "ran the live pass"
python3 report_lib.py claude-fix 2026-06-15 codex-e2e-2026-06-15-001 \
  --summary "..." --commit abc123 --files script.js --verified "live browser @390px"
# attach proof the fix works (click-to-expand thumbnail in the UI):
python3 report_lib.py add-shot 2026-06-15 codex-e2e-2026-06-15-001 \
  --file /tmp/hero-fixed.png --kind fix --caption "Hero @1440 — correct spacing, verified live"
python3 report_lib.py status 2026-06-15 codex_verifying   # hand back to Codex

# Codex, verifying phase
python3 report_lib.py verdict 2026-06-15 codex-e2e-2026-06-15-001 fixed --note "retested live"
python3 report_lib.py final 2026-06-15 attention_needed --summary "..." --needs-alex codex-e2e-2026-06-15-002
python3 report_lib.py status 2026-06-15 complete
```

`report_lib.py validate <date>` checks a report against the schema; the mutating
commands refuse to save anything that wouldn't validate.

## Files

```
qa-report-ui/
  serve.py          stdlib HTTP server + HTML renderer (the UI + lightbox)
  report_lib.py     schema, read/write helpers, and the CLI above
  reports/          one <run_date>.json per daily run  (tracked in git = QA history)
  shots/<date>/     screenshots referenced by that day's bugs, served at /shot/...
  README.md         this file
```
