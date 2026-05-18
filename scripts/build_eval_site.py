#!/usr/bin/env python3
"""
build_eval_site.py — Build the GitHub Pages site for nightly eval reports.

Reads eval/results/* from the current run, merges with any existing
history.json on the gh-pages branch, and writes a static site to
./gh-pages-site/ ready for peaceiris/actions-gh-pages to publish.

Output structure:
  gh-pages-site/
    .nojekyll
    index.html              — runs table + faithfulness trend chart
    history.json            — accumulating list of all past runs
    runs/<run_number>/
      index.html            — per-run landing
      report.md             — Ragas markdown
      giskard_rag.html      — Giskard RAG eval (self-contained)
      giskard_scan.html     — Giskard vulnerability scan (self-contained)
      metrics.json          — extracted summary numbers for the index

Environment:
  RUN_NUMBER       — GitHub Actions run_number (defaults to "local")
  RUN_ID           — GitHub Actions run_id (link target)
  COMMIT_SHA       — git SHA at run time
  REPO_SLUG        — "owner/repo" for run link
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "eval" / "results"
SITE = ROOT / "gh-pages-site"
EXISTING = ROOT / "gh-pages-existing"  # checked out gh-pages, if present

RUN_NUMBER = os.environ.get("RUN_NUMBER", "local")
RUN_ID = os.environ.get("RUN_ID", "")
COMMIT_SHA = os.environ.get("COMMIT_SHA", "")[:7]
REPO_SLUG = os.environ.get("REPO_SLUG", "qa-apps/PW_alexpavsky")
TIMESTAMP = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def extract_ragas_summary(md_path: Path) -> dict:
    """Pull faithfulness / relevancy / status out of the Ragas markdown."""
    out: dict = {"avg_faithfulness": None, "avg_relevancy": None, "status": "unknown"}
    if not md_path.exists():
        return out
    text = md_path.read_text(encoding="utf-8", errors="ignore")

    def grab(label: str) -> float | None:
        m = re.search(rf"Average\s+{label}.*?\|\s*([0-9.]+)", text, re.IGNORECASE)
        return float(m.group(1)) if m else None

    out["avg_faithfulness"] = grab("faithfulness")
    out["avg_relevancy"] = grab("(?:answer_relevancy|relevancy)")
    if "FAIL" in text.upper():
        out["status"] = "fail"
    elif out["avg_faithfulness"] is not None:
        out["status"] = "pass"
    return out


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def per_run_html(run_dir: Path, metrics: dict) -> str:
    ragas = metrics.get("ragas", {})
    gr = metrics.get("giskard_rag", {})
    gs = metrics.get("giskard_scan", {})
    commit_link = (
        f'<a href="https://github.com/{REPO_SLUG}/commit/{COMMIT_SHA}">{COMMIT_SHA}</a>'
        if COMMIT_SHA
        else "(local)"
    )
    run_link = (
        f'<a href="https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}">run #{RUN_NUMBER}</a>'
        if RUN_ID
        else f"run #{RUN_NUMBER}"
    )
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Eval run #{escape(str(RUN_NUMBER))}</title>
<style>
  body {{ font: 14px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; margin: 0 auto; max-width: 1100px; padding: 24px; color: #1a1a1a; }}
  h1 {{ margin: 0 0 4px; }} h2 {{ margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }}
  nav {{ font-size: 13px; color: #666; }} nav a {{ color: #0366d6; text-decoration: none; }}
  .meta {{ color: #666; font-size: 13px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0; }}
  .card {{ background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 12px 14px; }}
  .card .label {{ color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
  .card .value {{ font-size: 22px; font-weight: 600; margin-top: 4px; }}
  .status-pass {{ color: #0a7c0a; }} .status-fail {{ color: #b00020; }}
  iframe {{ width: 100%; height: 600px; border: 1px solid #d0d7de; border-radius: 6px; }}
  #ragas-md {{ background: #fff; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; }}
</style></head>
<body>
<nav><a href="../../index.html">← all runs</a></nav>
<h1>Eval run #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {commit_link} · {run_link}</p>

<div class="grid">
  <div class="card"><div class="label">Ragas faithfulness</div><div class="value {('status-pass' if (ragas.get('avg_faithfulness') or 0) >= 0.65 else 'status-fail')}">{ragas.get("avg_faithfulness", "—")}</div></div>
  <div class="card"><div class="label">Ragas relevancy</div><div class="value">{ragas.get("avg_relevancy", "—")}</div></div>
  <div class="card"><div class="label">Giskard RAG correctness</div><div class="value">{gr.get("correctness", "—")}</div></div>
  <div class="card"><div class="label">Giskard scan issues</div><div class="value">{gs.get("total_issues", "—")}</div></div>
</div>

<h2>Ragas report</h2>
<div id="ragas-md">Loading…</div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
fetch('report.md').then(r => r.ok ? r.text() : 'Ragas report not produced for this run.').then(t => {{
  document.getElementById('ragas-md').innerHTML = marked.parse(t);
}}).catch(e => {{ document.getElementById('ragas-md').textContent = 'Failed to load Ragas report: ' + e; }});
</script>

<h2>Giskard RAG evaluation</h2>
<iframe src="giskard_rag.html" title="Giskard RAG eval"></iframe>

<h2>Giskard vulnerability scan</h2>
<iframe src="giskard_scan.html" title="Giskard scan"></iframe>
</body></html>
"""


def index_html(history: list[dict]) -> str:
    # Newest first.
    rows = sorted(history, key=lambda r: r.get("run_number", 0), reverse=True)

    def cell(v, fmt=".3f"):
        if v is None or v == "—":
            return "—"
        try:
            return format(float(v), fmt)
        except Exception:
            return escape(str(v))

    body_rows = []
    for r in rows[:50]:
        rn = r.get("run_number", "?")
        ts = r.get("timestamp", "")[:19].replace("T", " ")
        ragas = r.get("ragas", {})
        gr = r.get("giskard_rag", {})
        gs = r.get("giskard_scan", {})
        faith = ragas.get("avg_faithfulness")
        cls = "status-pass" if (faith or 0) >= 0.65 else "status-fail"
        body_rows.append(
            f'<tr><td><a href="runs/{escape(str(rn))}/index.html">#{escape(str(rn))}</a></td>'
            f"<td>{escape(ts)}</td>"
            f'<td class="{cls}">{cell(faith)}</td>'
            f"<td>{cell(ragas.get('avg_relevancy'))}</td>"
            f"<td>{cell(gr.get('correctness'))}</td>"
            f"<td>{cell(gs.get('total_issues'), 'd') if gs.get('total_issues') is not None else '—'}</td>"
            f"<td>{escape(r.get('commit',''))}</td></tr>"
        )

    chart_data = [
        {
            "x": r.get("run_number"),
            "faith": r.get("ragas", {}).get("avg_faithfulness"),
            "rel": r.get("ragas", {}).get("avg_relevancy"),
        }
        for r in sorted(rows, key=lambda r: r.get("run_number", 0))
        if r.get("ragas", {}).get("avg_faithfulness") is not None
    ]

    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>LLM Eval Nightly — {escape(REPO_SLUG)}</title>
<style>
  body {{ font: 14px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; margin: 0 auto; max-width: 1100px; padding: 24px; color: #1a1a1a; }}
  h1 {{ margin: 0 0 4px; }} h2 {{ margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }}
  .meta {{ color: #666; font-size: 13px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  th, td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid #eaeaea; }}
  th {{ background: #f6f8fa; font-weight: 600; }}
  tbody tr:hover {{ background: #fafbfc; }}
  td a {{ color: #0366d6; text-decoration: none; }}
  .status-pass {{ color: #0a7c0a; font-weight: 600; }} .status-fail {{ color: #b00020; font-weight: 600; }}
  #chart-wrap {{ background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; margin-top: 8px; }}
</style></head>
<body>
<h1>LLM Eval Nightly</h1>
<p class="meta">
  Repo: <a href="https://github.com/{escape(REPO_SLUG)}">{escape(REPO_SLUG)}</a>
  · Runs: {len(rows)}
  · Latest: {escape((rows[0]['timestamp'][:19] if rows else '—').replace('T',' '))}
</p>

<h2>Faithfulness trend</h2>
<div id="chart-wrap"><canvas id="chart" height="80"></canvas></div>

<h2>Runs (last 50)</h2>
<table>
  <thead><tr>
    <th>Run</th><th>Timestamp (UTC)</th><th>Faithfulness</th><th>Relevancy</th>
    <th>Giskard RAG</th><th>Giskard issues</th><th>Commit</th>
  </tr></thead>
  <tbody>
    {''.join(body_rows) or '<tr><td colspan="7">No runs yet.</td></tr>'}
  </tbody>
</table>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script>
const data = {json.dumps(chart_data)};
new Chart(document.getElementById('chart'), {{
  type: 'line',
  data: {{
    labels: data.map(d => '#' + d.x),
    datasets: [
      {{ label: 'Faithfulness', data: data.map(d => d.faith), borderColor: '#0a7c0a', tension: 0.2 }},
      {{ label: 'Answer relevancy', data: data.map(d => d.rel), borderColor: '#0366d6', tension: 0.2 }},
    ]
  }},
  options: {{
    scales: {{ y: {{ min: 0, max: 1, ticks: {{ stepSize: 0.1 }} }} }},
    plugins: {{ legend: {{ position: 'bottom' }} }}
  }}
}});
</script>
</body></html>
"""


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("")

    # 1. Bring forward any existing site (history + previous runs) so prior
    # data isn't wiped. EXISTING is the gh-pages branch checked out by CI.
    history: list[dict] = []
    if EXISTING.exists():
        prev_runs = EXISTING / "runs"
        if prev_runs.is_dir():
            shutil.copytree(prev_runs, SITE / "runs", dirs_exist_ok=True)
        hist_path = EXISTING / "history.json"
        if hist_path.exists():
            try:
                history = json.loads(hist_path.read_text())
            except Exception:
                history = []

    # 2. Build this run's directory.
    run_dir = SITE / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)

    # Copy whatever the eval steps produced (any may be missing on partial runs).
    file_map = {
        RESULTS / "report.md": run_dir / "report.md",
        RESULTS / "giskard_rag.html": run_dir / "giskard_rag.html",
        RESULTS / "giskard_rag.json": run_dir / "giskard_rag.json",
        RESULTS / "giskard_scan.html": run_dir / "giskard_scan.html",
        RESULTS / "giskard_scan.json": run_dir / "giskard_scan.json",
    }
    copied = []
    for src, dst in file_map.items():
        if src.exists():
            shutil.copy2(src, dst)
            copied.append(dst.name)

    # Per-run placeholder HTMLs so iframes don't 404.
    for stub in ("giskard_rag.html", "giskard_scan.html"):
        p = run_dir / stub
        if not p.exists():
            p.write_text(
                f"<html><body><p>{stub} not produced for run #{RUN_NUMBER}.</p></body></html>"
            )

    # 3. Aggregate metrics for the index.
    metrics = {
        "run_number": (int(RUN_NUMBER) if str(RUN_NUMBER).isdigit() else RUN_NUMBER),
        "run_id": RUN_ID,
        "timestamp": TIMESTAMP,
        "commit": COMMIT_SHA,
        "ragas": extract_ragas_summary(RESULTS / "report.md"),
        "giskard_rag": load_json(RESULTS / "giskard_rag.json"),
        "giskard_scan": load_json(RESULTS / "giskard_scan.json"),
        "files": copied,
    }
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))

    # 4. Update history (replace if same run_number re-published).
    history = [h for h in history if h.get("run_number") != metrics["run_number"]]
    history.append(metrics)
    (SITE / "history.json").write_text(json.dumps(history, indent=2))

    # 5. Per-run + root pages.
    (run_dir / "index.html").write_text(per_run_html(run_dir, metrics))
    (SITE / "index.html").write_text(index_html(history))

    print(f"Site built at {SITE}")
    print(f"  Run #{RUN_NUMBER}: {len(copied)} report files copied")
    print(f"  History now has {len(history)} runs")


if __name__ == "__main__":
    main()
