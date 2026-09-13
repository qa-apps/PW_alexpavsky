#!/usr/bin/env python3
"""Build a static GitHub Pages UI for Playwright CI results."""
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
        hist = SITE / "playwright" / "history.json"
        if hist.exists():
            try:
                history = json.loads(hist.read_text(encoding="utf-8"))
            except Exception:
                history = []
    return history


def collect_tests() -> list[dict]:
    tests: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def walk_suite(suite: dict, parents: list[str]) -> None:
        title = suite.get("title")
        next_parents = parents + ([title] if title else [])
        for spec in suite.get("specs", []) or []:
            spec_title = spec.get("title") or ""
            for test in spec.get("tests", []) or []:
                project = test.get("projectName") or ""
                full_title = " › ".join([*next_parents, spec_title]).strip(" ›")
                errors = []
                attachments = []
                for result in test.get("results", []) or []:
                    for err in result.get("errors", []) or []:
                        msg = err.get("message") or err.get("value") or ""
                        if msg:
                            errors.append(str(msg))
                    for att in result.get("attachments", []) or []:
                        if att.get("path"):
                            attachments.append(str(att["path"]))
                key = (project, full_title)
                if key in seen:
                    continue
                seen.add(key)
                tests.append({
                    "project": project,
                    "title": full_title or spec_title or "test",
                    "status": test.get("status") or "unknown",
                    "errors": errors,
                    "attachments": attachments,
                })
        for child in suite.get("suites", []) or []:
            walk_suite(child, next_parents)

    for path in Path("test-results").rglob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for suite in data.get("suites", []) or []:
            walk_suite(suite, [])
    return tests


def stats(tests: list[dict]) -> dict:
    return {
        "passed": sum(1 for t in tests if t["status"] == "expected"),
        "failed": sum(1 for t in tests if t["status"] == "unexpected"),
        "flaky": sum(1 for t in tests if t["status"] == "flaky"),
        "skipped": sum(1 for t in tests if t["status"] == "skipped"),
    }


def rows(tests: list[dict], wanted: set[str]) -> str:
    out = []
    for test in tests:
        if test["status"] not in wanted:
            continue
        detail_text = "\n\n".join(test.get("errors") or [])
        if test.get("attachments"):
            detail_text += ("\n\n" if detail_text else "") + "\n".join(test["attachments"])
        details = (
            f"<details><summary>error / artifacts</summary><pre>{escape(detail_text[:5000])}</pre></details>"
            if detail_text
            else ""
        )
        cls = "pass" if test["status"] == "expected" else "fail"
        out.append(
            f"<tr><td class='{cls}'>{escape(test['status'])}</td>"
            f"<td>{escape(test.get('project') or '')}</td>"
            f"<td>{escape(test['title'])}{details}</td></tr>"
        )
    return "".join(out)


def run_html(run_dir: Path, tests: list[dict]) -> str:
    s = stats(tests)
    total = sum(s.values())
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    report_link = "playwright-report/index.html" if (run_dir / "playwright-report" / "index.html").exists() else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Playwright run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif; margin:0 auto; max-width:1180px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} .meta {{ color:#656d76; }}
.cards {{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin:18px 0; }}
.card {{ border:1px solid #d0d7de; border-radius:6px; padding:12px; background:#f6f8fa; }} .value {{ font-size:24px; font-weight:700; }}
table {{ width:100%; border-collapse:collapse; margin-top:16px; }} th,td {{ padding:8px 10px; border-bottom:1px solid #d8dee4; text-align:left; vertical-align:top; }} th {{ background:#f6f8fa; }}
pre {{ white-space:pre-wrap; max-width:860px; }} .pass {{ color:#1a7f37; font-weight:700; }} .fail {{ color:#cf222e; font-weight:700; }}
</style></head><body>
<p><a href="../../index.html">← all Playwright runs</a></p>
<h1>Playwright CI #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {escape(COMMIT_SHA or 'unknown')} · {f'<a href="{run_link}">GitHub run</a>' if run_link else 'local run'}</p>
<div class="cards">
<div class="card"><div>Passed</div><div class="value pass">{s['passed']}</div></div>
<div class="card"><div>Failed</div><div class="value fail">{s['failed']}</div></div>
<div class="card"><div>Flaky</div><div class="value">{s['flaky']}</div></div>
<div class="card"><div>Skipped</div><div class="value">{s['skipped']}</div></div>
<div class="card"><div>Total</div><div class="value">{total}</div></div>
</div>
{f'<p><a href="{report_link}">Open full Playwright HTML report</a></p>' if report_link else '<p>Playwright HTML report not produced.</p>'}
<h2>Failed and flaky tests</h2>
<table><thead><tr><th>Status</th><th>Project</th><th>Test</th></tr></thead><tbody>{rows(tests, {'unexpected', 'flaky'}) or '<tr><td colspan="3">No failed or flaky tests.</td></tr>'}</tbody></table>
<h2>Passed tests</h2>
<table><thead><tr><th>Status</th><th>Project</th><th>Test</th></tr></thead><tbody>{rows(tests, {'expected'}) or '<tr><td colspan="3">No passed tests listed in JSON output.</td></tr>'}</tbody></table>
</body></html>"""


def index_html(history: list[dict]) -> str:
    def key(record):
        try:
            return int(record.get("run_number", 0))
        except Exception:
            return 0
    body = []
    for h in sorted(history, key=key, reverse=True)[:50]:
        body.append(
            f"<tr><td><a href='runs/{escape(str(h.get('run_number')))}/index.html'>#{escape(str(h.get('run_number')))}</a></td>"
            f"<td>{escape(str(h.get('timestamp', ''))[:19].replace('T', ' '))}</td>"
            f"<td>{escape(str(h.get('passed', 0)))}/{escape(str(h.get('total', 0)))}</td>"
            f"<td>{escape(str(h.get('failed', 0)))}</td><td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Playwright Dashboard</title>
<style>body{{font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 auto;max-width:1000px;padding:24px;color:#1f2328}}a{{color:#0969da;text-decoration:none}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px 10px;border-bottom:1px solid #d8dee4;text-align:left}}th{{background:#f6f8fa}}</style>
</head><body><h1>Playwright Dashboard</h1><p>Deterministic Playwright CI runs with passed and failed test lists.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Passed</th><th>Failed</th><th>Commit</th></tr></thead>
<tbody>{''.join(body) or '<tr><td colspan="5">No runs yet.</td></tr>'}</tbody></table></body></html>"""


def main() -> None:
    history = carry_forward()
    root = SITE / "playwright"
    run_dir = root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    if Path("playwright-report").exists():
        shutil.copytree("playwright-report", run_dir / "playwright-report", dirs_exist_ok=True)
    if Path("test-results").exists():
        shutil.copytree("test-results", run_dir / "test-results", dirs_exist_ok=True)
    tests = collect_tests()
    s = stats(tests)
    (run_dir / "index.html").write_text(run_html(run_dir, tests), encoding="utf-8")
    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "passed": s["passed"],
        "failed": s["failed"],
        "total": sum(s.values()),
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    root.mkdir(parents=True, exist_ok=True)
    (root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (root / "index.html").write_text(index_html(history), encoding="utf-8")


if __name__ == "__main__":
    main()
