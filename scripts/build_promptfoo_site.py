#!/usr/bin/env python3
"""Build a static GitHub Pages UI for promptfoo results."""
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
RESULTS = ROOT / "promptfoo-results.json"
RUN_NUMBER = os.environ.get("RUN_NUMBER", "local")
RUN_ID = os.environ.get("RUN_ID", "")
COMMIT_SHA = os.environ.get("COMMIT_SHA", "")[:7]
REPO_SLUG = os.environ.get("REPO_SLUG", "qa-apps/PW_alexpavsky")
TIMESTAMP = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def load_results() -> list[dict]:
    try:
        data = json.loads(RESULTS.read_text(encoding="utf-8"))
    except Exception:
        return []
    raw = data.get("results", {}).get("results") if isinstance(data.get("results"), dict) else data.get("results")
    out = []
    for item in raw or []:
        provider = item.get("provider")
        provider_label = (provider or {}).get("label") if isinstance(provider, dict) else provider
        test_case = item.get("testCase") or {}
        out.append({
            "success": bool(item.get("success")),
            "score": item.get("score"),
            "description": test_case.get("description") or (item.get("vars") or {}).get("prompt", "test"),
            "provider": provider_label or "provider",
            "prompt": (item.get("vars") or {}).get("prompt", ""),
            "error": item.get("error") or "",
            "response": item.get("response", {}).get("output") if isinstance(item.get("response"), dict) else item.get("response", ""),
        })
    return out


def carry_forward_site() -> list[dict]:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("")

    history: list[dict] = []
    if EXISTING.exists():
        for item in EXISTING.iterdir():
            if item.name == ".git":
                continue
            dest = SITE / item.name
            if item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)
        hist = SITE / "promptfoo" / "history.json"
        if hist.exists():
            try:
                history = json.loads(hist.read_text(encoding="utf-8"))
            except Exception:
                history = []
    return history


def run_html(results: list[dict]) -> str:
    rows = []
    for r in results:
        mark = "PASS" if r["success"] else "FAIL"
        cls = "pass" if r["success"] else "fail"
        detail = r["error"] or r["response"] or ""
        rows.append(
            "<tr>"
            f"<td class='{cls}'>{mark}</td>"
            f"<td>{escape(str(r['description']))}</td>"
            f"<td>{escape(str(r['provider']))}</td>"
            f"<td>{escape(str(r.get('score') if r.get('score') is not None else ''))}</td>"
            f"<td><details><summary>details</summary><pre>{escape(str(detail)[:4000])}</pre></details></td>"
            "</tr>"
        )
    passed = sum(1 for r in results if r["success"])
    total = len(results)
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Promptfoo run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font: 14px/1.45 -apple-system, BlinkMacSystemFont, sans-serif; margin: 0 auto; max-width: 1200px; padding: 24px; color: #1f2328; }}
a {{ color: #0969da; text-decoration: none; }} .meta {{ color: #656d76; }}
.cards {{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; margin:18px 0; }}
.card {{ border:1px solid #d0d7de; border-radius:6px; padding:12px; background:#f6f8fa; }}
.label {{ color:#656d76; font-size:12px; text-transform:uppercase; }} .value {{ font-size:24px; font-weight:700; }}
table {{ width:100%; border-collapse:collapse; }} th,td {{ padding:8px 10px; border-bottom:1px solid #d8dee4; text-align:left; vertical-align:top; }}
th {{ background:#f6f8fa; }} .pass {{ color:#1a7f37; font-weight:700; }} .fail {{ color:#cf222e; font-weight:700; }}
pre {{ white-space:pre-wrap; max-width:760px; }}
</style></head><body>
<p><a href="../../index.html">← all Promptfoo runs</a></p>
<h1>Promptfoo Daily Eval #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {escape(COMMIT_SHA or 'unknown')} · {f'<a href="{run_link}">GitHub run</a>' if run_link else 'local run'}</p>
<div class="cards">
  <div class="card"><div class="label">Passed</div><div class="value pass">{passed}</div></div>
  <div class="card"><div class="label">Failed</div><div class="value fail">{total - passed}</div></div>
  <div class="card"><div class="label">Total</div><div class="value">{total}</div></div>
</div>
<table><thead><tr><th>Status</th><th>Test</th><th>Provider</th><th>Score</th><th>Output</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="5">No results produced.</td></tr>'}</tbody></table>
</body></html>"""


def index_html(history: list[dict]) -> str:
    rows = []
    def key(record):
        try:
            return int(record.get("run_number", 0))
        except Exception:
            return 0

    for h in sorted(history, key=key, reverse=True)[:50]:
        failed = h.get("failed", 0)
        cls = "pass" if failed == 0 and h.get("total", 0) else "fail"
        rows.append(
            f"<tr><td><a href='runs/{escape(str(h.get('run_number')))}/index.html'>#{escape(str(h.get('run_number')))}</a></td>"
            f"<td>{escape(str(h.get('timestamp', ''))[:19].replace('T', ' '))}</td>"
            f"<td class='{cls}'>{escape(str(h.get('passed', 0)))}/{escape(str(h.get('total', 0)))}</td>"
            f"<td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Promptfoo Eval Dashboard</title>
<style>
body {{ font: 14px/1.45 -apple-system, BlinkMacSystemFont, sans-serif; margin:0 auto; max-width:1000px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} table {{ width:100%; border-collapse:collapse; margin-top:16px; }}
th,td {{ padding:8px 10px; border-bottom:1px solid #d8dee4; text-align:left; }} th {{ background:#f6f8fa; }}
.pass {{ color:#1a7f37; font-weight:700; }} .fail {{ color:#cf222e; font-weight:700; }}
</style></head><body>
<h1>Promptfoo Eval Dashboard</h1>
<p>Latest daily prompt regression runs for alexpavsky.com.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Pass rate</th><th>Commit</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="4">No runs yet.</td></tr>'}</tbody></table>
</body></html>"""


def main() -> None:
    history = carry_forward_site()
    results = load_results()
    passed = sum(1 for r in results if r["success"])
    total = len(results)

    promptfoo_root = SITE / "promptfoo"
    run_dir = promptfoo_root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(RESULTS, run_dir / "promptfoo-results.json") if RESULTS.exists() else None
    (run_dir / "index.html").write_text(run_html(results), encoding="utf-8")

    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "passed": passed,
        "failed": total - passed,
        "total": total,
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    promptfoo_root.mkdir(parents=True, exist_ok=True)
    (promptfoo_root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (promptfoo_root / "index.html").write_text(index_html(history), encoding="utf-8")


if __name__ == "__main__":
    main()
