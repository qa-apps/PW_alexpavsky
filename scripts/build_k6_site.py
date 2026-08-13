#!/usr/bin/env python3
"""Build a static GitHub Pages UI for k6 summary JSON files."""
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
RESULTS_DIR = ROOT / "performance-results"
RUN_NUMBER = os.environ.get("RUN_NUMBER", "local")
RUN_ID = os.environ.get("RUN_ID", "")
COMMIT_SHA = os.environ.get("COMMIT_SHA", "")[:7]
REPO_SLUG = os.environ.get("REPO_SLUG", "qa-apps/PW_alexpavsky")
TIMESTAMP = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def metric(metrics: dict, name: str, value: str, default=0):
    item = metrics.get(name, {})
    if "values" in item:
        return item.get("values", {}).get(value, default)
    if value == "rate" and "value" in item:
        return item.get("value", default)
    return item.get(value, default)


def load_results() -> list[dict]:
    out = []
    for path in sorted(RESULTS_DIR.glob("k6-*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        metrics = data.get("metrics", {})
        out.append({
            "profile": path.stem.replace("k6-", ""),
            "p95": metric(metrics, "http_req_duration", "p(95)", 0) or 0,
            "p99": metric(metrics, "http_req_duration", "p(99)", 0) or 0,
            "avg": metric(metrics, "http_req_duration", "avg", 0) or 0,
            "rps": metric(metrics, "http_reqs", "rate", 0) or 0,
            "requests": metric(metrics, "http_reqs", "count", 0) or 0,
            "fail_rate": metric(metrics, "http_req_failed", "rate", 0) or 0,
            "checks": metric(metrics, "checks", "rate", 0) or 0,
            "dropped": metric(metrics, "dropped_iterations", "count", 0) or 0,
            "file": path.name,
        })
    return out


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
        hist = SITE / "k6" / "history.json"
        if hist.exists():
            try:
                history = json.loads(hist.read_text(encoding="utf-8"))
            except Exception:
                history = []
    return history


def run_html(results: list[dict]) -> str:
    rows = []
    for r in results:
        rows.append(
            "<tr>"
            f"<td>{escape(r['profile'])}</td>"
            f"<td>{r['p95']:.0f} ms</td><td>{r['p99']:.0f} ms</td><td>{r['avg']:.0f} ms</td>"
            f"<td>{r['rps']:.1f}</td><td>{int(r['requests'])}</td>"
            f"<td>{r['fail_rate'] * 100:.2f}%</td><td>{r['checks'] * 100:.2f}%</td><td>{int(r['dropped'])}</td>"
            "</tr>"
        )
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>k6 run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif; margin:0 auto; max-width:1100px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} .meta {{ color:#656d76; }}
table {{ width:100%; border-collapse:collapse; margin-top:16px; }} th,td {{ padding:8px 10px; border-bottom:1px solid #d8dee4; text-align:left; }}
th {{ background:#f6f8fa; }}
</style></head><body>
<p><a href="../../index.html">← all k6 runs</a></p>
<h1>k6 Performance #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {escape(COMMIT_SHA or 'unknown')} · {f'<a href="{run_link}">GitHub run</a>' if run_link else 'local run'}</p>
<table><thead><tr><th>Profile</th><th>p95</th><th>p99</th><th>Avg</th><th>RPS</th><th>Requests</th><th>Fail rate</th><th>Checks</th><th>Dropped</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="9">No k6 results produced.</td></tr>'}</tbody></table>
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
            f"<td>{escape(str(h.get('profiles', 0)))}</td><td>{escape(str(h.get('requests', 0)))}</td>"
            f"<td>{escape(str(h.get('max_p95_ms', 0)))} ms</td><td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>k6 Dashboard</title>
<style>body{{font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 auto;max-width:1000px;padding:24px;color:#1f2328}}a{{color:#0969da;text-decoration:none}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px 10px;border-bottom:1px solid #d8dee4;text-align:left}}th{{background:#f6f8fa}}</style>
</head><body><h1>k6 Performance Dashboard</h1><p>Latest public performance profiles.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Profiles</th><th>Requests</th><th>Worst p95</th><th>Commit</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="6">No runs yet.</td></tr>'}</tbody></table></body></html>"""


def main() -> None:
    history = carry_forward()
    results = load_results()
    k6_root = SITE / "k6"
    run_dir = k6_root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    if RESULTS_DIR.exists():
        shutil.copytree(RESULTS_DIR, run_dir / "raw", dirs_exist_ok=True)
    (run_dir / "index.html").write_text(run_html(results), encoding="utf-8")

    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "profiles": len(results),
        "requests": int(sum(r["requests"] for r in results)),
        "max_p95_ms": int(max((r["p95"] for r in results), default=0)),
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    k6_root.mkdir(parents=True, exist_ok=True)
    (k6_root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (k6_root / "index.html").write_text(index_html(history), encoding="utf-8")


if __name__ == "__main__":
    main()
