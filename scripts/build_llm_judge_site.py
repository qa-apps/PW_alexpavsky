#!/usr/bin/env python3
"""Build a static GitHub Pages UI for LLM Judge Playwright results."""
from __future__ import annotations

import datetime as dt
import json
import os
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXISTING = ROOT / "gh-pages-existing"
SITE = ROOT / "gh-pages-site"
RUN_NUMBER = os.environ.get("RUN_NUMBER", "local")
RUN_ID = os.environ.get("RUN_ID", "")
COMMIT_SHA = os.environ.get("COMMIT_SHA", "")[:7]
REPO_SLUG = os.environ.get("REPO_SLUG", "qa-apps/PW_alexpavsky")
TIMESTAMP = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def carry_forward() -> list[dict]:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("")
    history = []
    if EXISTING.exists():
        for item in EXISTING.iterdir():
            if item.name == ".git":
                continue
            dest = SITE / item.name
            if item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)
        hist = SITE / "llm-judge" / "history.json"
        if hist.exists():
            try:
                history = json.loads(hist.read_text(encoding="utf-8"))
            except Exception:
                history = []
    return history


def playwright_stats() -> dict:
    for path in Path("test-results").rglob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        stats = data.get("stats") or {}
        if stats:
            return {
                "passed": stats.get("expected", 0),
                "failed": stats.get("unexpected", 0),
                "flaky": stats.get("flaky", 0),
                "skipped": stats.get("skipped", 0),
            }
    return {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0}


def verdict_rows(run_dir: Path) -> str:
    rows = []
    verdict_root = Path("judge-verdicts")
    if not verdict_root.exists():
        verdict_root = Path("test-results")
    target = run_dir / "judge-verdicts"
    if verdict_root.exists():
        shutil.copytree(verdict_root, target, dirs_exist_ok=True)
    for path in sorted(target.rglob("*")) if target.exists() else []:
        if not path.is_file():
            continue
        rel = path.relative_to(run_dir)
        text = path.read_text(encoding="utf-8", errors="ignore")[:3000]
        rows.append(
            f"<tr><td><a href='{escape(str(rel))}'>{escape(path.name)}</a></td>"
            f"<td><details><summary>preview</summary><pre>{escape(text)}</pre></details></td></tr>"
        )
    return "".join(rows)


def run_html(run_dir: Path, stats: dict) -> str:
    total = sum(stats.values())
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    rows = verdict_rows(run_dir)
    report_link = "playwright-report/index.html" if (run_dir / "playwright-report" / "index.html").exists() else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>LLM Judge run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif; margin:0 auto; max-width:1100px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} .meta {{ color:#656d76; }}
.cards {{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin:18px 0; }}
.card {{ border:1px solid #d0d7de; border-radius:6px; padding:12px; background:#f6f8fa; }} .value {{ font-size:24px; font-weight:700; }}
table {{ width:100%; border-collapse:collapse; margin-top:16px; }} th,td {{ padding:8px 10px; border-bottom:1px solid #d8dee4; text-align:left; vertical-align:top; }} th {{ background:#f6f8fa; }}
pre {{ white-space:pre-wrap; max-width:760px; }}
</style></head><body>
<p><a href="../../index.html">← all LLM Judge runs</a></p>
<h1>LLM Judge #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {escape(COMMIT_SHA or 'unknown')} · {f'<a href="{run_link}">GitHub run</a>' if run_link else 'local run'}</p>
<div class="cards">
<div class="card"><div>Passed</div><div class="value">{stats['passed']}</div></div>
<div class="card"><div>Failed</div><div class="value">{stats['failed']}</div></div>
<div class="card"><div>Flaky</div><div class="value">{stats['flaky']}</div></div>
<div class="card"><div>Skipped</div><div class="value">{stats['skipped']}</div></div>
<div class="card"><div>Total</div><div class="value">{total}</div></div>
</div>
{f'<p><a href="{report_link}">Open full Playwright HTML report</a></p>' if report_link else '<p>Playwright HTML report not produced.</p>'}
<h2>Judge verdict files</h2>
<table><thead><tr><th>File</th><th>Preview</th></tr></thead><tbody>{rows or '<tr><td colspan="2">No verdict files produced.</td></tr>'}</tbody></table>
</body></html>"""


def index_html(history: list[dict]) -> str:
    def key(record):
        try:
            return int(record.get("run_number", 0))
        except Exception:
            return 0
    rows = []
    for h in sorted(history, key=key, reverse=True)[:50]:
        rows.append(
            f"<tr><td><a href='runs/{escape(str(h.get('run_number')))}/index.html'>#{escape(str(h.get('run_number')))}</a></td>"
            f"<td>{escape(str(h.get('timestamp', ''))[:19].replace('T', ' '))}</td>"
            f"<td>{escape(str(h.get('passed', 0)))}/{escape(str(h.get('total', 0)))}</td>"
            f"<td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>LLM Judge Dashboard</title>
<style>body{{font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 auto;max-width:1000px;padding:24px;color:#1f2328}}a{{color:#0969da;text-decoration:none}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px 10px;border-bottom:1px solid #d8dee4;text-align:left}}th{{background:#f6f8fa}}</style>
</head><body><h1>LLM Judge Dashboard</h1><p>Daily chatbot judge verdicts and Playwright reports.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Passed</th><th>Commit</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="4">No runs yet.</td></tr>'}</tbody></table></body></html>"""


def main() -> None:
    history = carry_forward()
    llm_root = SITE / "llm-judge"
    run_dir = llm_root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    if Path("playwright-report").exists():
        shutil.copytree("playwright-report", run_dir / "playwright-report", dirs_exist_ok=True)
    stats = playwright_stats()
    (run_dir / "index.html").write_text(run_html(run_dir, stats), encoding="utf-8")

    total = sum(stats.values())
    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "passed": stats["passed"],
        "failed": stats["failed"],
        "total": total,
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    llm_root.mkdir(parents=True, exist_ok=True)
    (llm_root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (llm_root / "index.html").write_text(index_html(history), encoding="utf-8")


if __name__ == "__main__":
    main()
