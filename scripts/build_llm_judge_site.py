#!/usr/bin/env python3
"""Build a static GitHub Pages UI for LLM Judge Playwright results.

Every test in the run page is a collapsible row. Expanding it shows, for each
judged answer: the prompt sent to the chatbot, the chatbot's answer, the judge,
its 1-5 score against the pass threshold, PASS/FAIL, the criteria and the
judge's written explanation. Verdicts come from
test-results/judge-verdicts/verdicts.jsonl (utils/verdict-reporter.ts); older
runs that only have verdict-report-*.md files are parsed as a fallback.
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
EXISTING = ROOT / "gh-pages-existing"
SITE = ROOT / "gh-pages-site"
RUN_NUMBER = os.environ.get("RUN_NUMBER", "local")
RUN_ID = os.environ.get("RUN_ID", "")
COMMIT_SHA = os.environ.get("COMMIT_SHA", "")[:7]
REPO_SLUG = os.environ.get("REPO_SLUG", "qa-apps/PW_alexpavsky")
TIMESTAMP = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
PASSING_SCORE = os.environ.get("LLM_JUDGE_PASSING_SCORE", "3")

RESULTS_DIRS = [Path("test-results"), Path("judge-verdicts")]
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
STATUS_LABEL = {"expected": "PASS", "unexpected": "FAIL", "flaky": "FLAKY", "skipped": "SKIPPED"}
STATUS_ORDER = {"unexpected": 0, "flaky": 1, "expected": 2, "skipped": 3}


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


def playwright_reports() -> list[dict]:
    preferred = Path("test-results") / "results.json"
    paths = [preferred] if preferred.exists() else sorted(Path("test-results").rglob("*.json"))
    reports = []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, dict) and ("suites" in data or "stats" in data):
            reports.append(data)
    return reports


def playwright_stats(reports: list[dict]) -> dict:
    for data in reports:
        stats = data.get("stats") or {}
        if stats:
            return {
                "passed": stats.get("expected", 0),
                "failed": stats.get("unexpected", 0),
                "flaky": stats.get("flaky", 0),
                "skipped": stats.get("skipped", 0),
            }
    return {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0}


def collect_tests(reports: list[dict]) -> list[dict]:
    tests: list[dict] = []
    seen: set[tuple] = set()

    def walk(suite: dict, parents: list[str], file: str) -> None:
        file = suite.get("file") or file
        title = suite.get("title") or ""
        # The top-level suite is the spec file; keep it out of the title path.
        path = parents + ([title] if title and title != file else [])
        for spec in suite.get("specs", []) or []:
            for t in spec.get("tests", []) or []:
                key = (file, tuple(path), spec.get("title"), t.get("projectName"))
                if key in seen:
                    continue
                seen.add(key)
                errors, duration = [], 0
                for result in t.get("results", []) or []:
                    duration += result.get("duration", 0) or 0
                    for err in result.get("errors", []) or []:
                        msg = err.get("message") or err.get("value") or ""
                        if msg:
                            errors.append(ANSI.sub("", str(msg)))
                tests.append({
                    "file": spec.get("file") or file,
                    "path": path,
                    "title": spec.get("title") or "test",
                    "project": t.get("projectName") or "",
                    "status": t.get("status") or "unknown",
                    "duration_ms": duration,
                    "errors": errors,
                    "verdicts": [],
                })
        for child in suite.get("suites", []) or []:
            walk(child, path, file)

    for data in reports:
        for suite in data.get("suites", []) or []:
            walk(suite, [], suite.get("file") or suite.get("title") or "")
    return tests


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().lower()


def load_jsonl_verdicts() -> list[dict]:
    records = []
    for base in RESULTS_DIRS:
        for path in sorted(base.rglob("verdicts.jsonl")) if base.exists() else []:
            for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return records


MD_SECTION = re.compile(
    r"^## (?P<title>.+?)\n+\*\*Judge:\*\* (?P<judge>.+?) \((?P<key>[^)]*)\)\s*\n"
    r"\*\*Score:\*\* (?P<score>\d+)/5\s*\n\*\*Result:\*\* (?P<result>PASS|FAIL)\s*\n+"
    r"\*\*Criteria:\*\* (?P<criteria>.*?)\n+### Prompt\n```\n(?P<prompt>.*?)\n```\n+"
    r"### Response\n```\n(?P<response>.*?)\n```\n+### Reasoning\n(?P<reasoning>.*?)\n+---",
    re.S | re.M,
)


def load_markdown_verdicts() -> list[dict]:
    records = []
    for base in RESULTS_DIRS:
        for path in sorted(base.rglob("verdict-report-*.md")) if base.exists() else []:
            text = path.read_text(encoding="utf-8", errors="ignore")
            for m in MD_SECTION.finditer(text):
                records.append({
                    "titlePath": [m["title"].strip()],
                    "judge": m["judge"].strip(),
                    "judgeName": m["key"].strip(),
                    "criteria": [c.strip() for c in m["criteria"].split(";") if c.strip()],
                    "score": int(m["score"]),
                    "maxScore": 5,
                    "passingScore": int(PASSING_SCORE),
                    "passed": m["result"] == "PASS",
                    "prompt": m["prompt"],
                    "response": m["response"],
                    "reasoning": m["reasoning"].strip(),
                })
    return records


def attach_verdicts(tests: list[dict], verdicts: list[dict]) -> list[dict]:
    """Attach verdicts to tests; return the ones that match no test."""
    by_path: dict[tuple, list[dict]] = {}
    by_title: dict[str, list[dict]] = {}
    for t in tests:
        by_path.setdefault(tuple(_norm(p) for p in t["path"] + [t["title"]]), []).append(t)
        by_title.setdefault(_norm(t["title"]), []).append(t)

    orphans = []
    for v in verdicts:
        title_path = [str(p) for p in v.get("titlePath") or [] if str(p).strip()]
        target = None
        if title_path:
            key = tuple(_norm(p) for p in title_path)
            for size in range(len(key), 0, -1):
                cands = by_path.get(key[-size:]) if size == len(key) else None
                if cands:
                    target = cands
                    break
            if target is None:
                target = by_title.get(_norm(title_path[-1]))
        if target:
            # Same test in several projects: attach to the first one only.
            target[0]["verdicts"].append(v)
        else:
            orphans.append(v)
    return orphans


def _pre(text: str) -> str:
    text = str(text or "").replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    return f"<pre>{escape(text)}</pre>"


def verdict_html(v: dict, index: int, total: int) -> str:
    passed = bool(v.get("passed"))
    score = v.get("score", "?")
    max_score = v.get("maxScore", 5)
    threshold = v.get("passingScore", PASSING_SCORE)
    retry = v.get("retry")
    head = [
        f"<span class='badge {'pass' if passed else 'fail'}'>{'PASS' if passed else 'FAIL'}</span>",
        f"<b>Score {escape(str(score))}/{escape(str(max_score))}</b>",
        f"<span class='muted'>pass threshold ≥ {escape(str(threshold))}</span>",
        f"Judge: {escape(str(v.get('judge') or v.get('judgeName') or 'LLM judge'))}",
    ]
    if v.get("judgeModel"):
        head.append(f"<span class='muted'>model {escape(str(v['judgeModel']))}</span>")
    if total > 1:
        head.insert(0, f"<span class='muted'>verdict {index}/{total}</span>")
    if retry:
        head.append(f"<span class='muted'>retry #{escape(str(retry))}</span>")
    parts = [f"<div class='vhead'>{' · '.join(head)}</div>"]
    if v.get("prompt"):
        parts.append("<h4>Prompt</h4>" + _pre(v["prompt"]))
    if v.get("response"):
        parts.append("<h4>Chatbot answer</h4>" + _pre(v["response"]))
    parts.append(
        "<h4>Judge explanation — why "
        f"{'PASS' if passed else 'FAIL'}</h4><p class='reason'>{escape(str(v.get('reasoning') or 'No reasoning provided.'))}</p>"
    )
    criteria = v.get("criteria") or []
    if criteria:
        parts.append("<h4>Criteria</h4><ul>" + "".join(f"<li>{escape(str(c))}</li>" for c in criteria) + "</ul>")
    return f"<div class='verdict {'pass' if passed else 'fail'}'>{''.join(parts)}</div>"


def test_html(t: dict) -> str:
    status = t["status"]
    label = STATUS_LABEL.get(status, status.upper())
    cls = {"expected": "pass", "unexpected": "fail", "flaky": "flaky"}.get(status, "skip")
    verdicts = t["verdicts"]
    if verdicts:
        scores = [v.get("score") for v in verdicts if isinstance(v.get("score"), (int, float))]
        worst = min(scores) if scores else None
        score_txt = (
            f"judge {worst}/5" if len(verdicts) == 1 and worst is not None
            else f"{len(verdicts)} verdicts · lowest {worst}/5" if worst is not None
            else f"{len(verdicts)} verdicts"
        )
    else:
        score_txt = "no judge verdict"
    crumbs = " › ".join(escape(p) for p in t["path"])
    title = f"{crumbs + ' › ' if crumbs else ''}<b>{escape(t['title'])}</b>"
    body = [verdict_html(v, i + 1, len(verdicts)) for i, v in enumerate(verdicts)]
    if not verdicts:
        body.append("<p class='muted'>This test did not record an LLM judge verdict "
                    "(functional assertion or the test failed before the judge ran).</p>")
    if t["errors"]:
        body.append("<h4>Test error</h4>" + _pre("\n\n".join(t["errors"])[:6000]))
    meta = f"{escape(t['file'])} · {escape(t['project'] or 'default')} · {t['duration_ms'] / 1000:.1f}s"
    body.append(f"<p class='muted small'>{meta}</p>")
    return (
        f"<details class='test {cls}'{' open' if status in ('unexpected', 'flaky') else ''}>"
        f"<summary><span class='badge {cls}'>{escape(label)}</span>"
        f"<span class='ttl'>{title}</span><span class='score'>{escape(score_txt)}</span></summary>"
        f"<div class='body'>{''.join(body)}</div></details>"
    )


def copy_verdict_files(run_dir: Path) -> list[str]:
    target = run_dir / "judge-verdicts"
    links = []
    for base in RESULTS_DIRS:
        for path in sorted(base.rglob("*")) if base.exists() else []:
            if path.is_file() and ("judge-verdicts" in path.parts or path.name.startswith("verdict")) \
                    and path.suffix in {".md", ".jsonl"}:
                dest = target / path.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, dest)
                links.append(f"<a href='judge-verdicts/{escape(path.name)}'>{escape(path.name)}</a>")
    return sorted(set(links))


def run_html(run_dir: Path, stats: dict, tests: list[dict], orphans: list[dict]) -> str:
    total = sum(stats.values())
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    report_link = "playwright-report/index.html" if (run_dir / "playwright-report" / "index.html").exists() else ""
    ordered = sorted(tests, key=lambda t: (STATUS_ORDER.get(t["status"], 9), t["path"], t["title"]))
    rows = "".join(test_html(t) for t in ordered)
    judged = [v for t in tests for v in t["verdicts"]]
    avg = (sum(v.get("score", 0) for v in judged) / len(judged)) if judged else None
    orphan_html = ""
    if orphans:
        orphan_html = "<h2>Verdicts not linked to a test</h2>" + "".join(
            verdict_html(v, i + 1, len(orphans)) for i, v in enumerate(orphans)
        )
    files = copy_verdict_files(run_dir)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>LLM Judge run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif; margin:0 auto; max-width:1100px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} .meta, .muted {{ color:#656d76; }} .small {{ font-size:12px; }}
.cards {{ display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin:18px 0; }}
.card {{ border:1px solid #d0d7de; border-radius:6px; padding:12px; background:#f6f8fa; }} .value {{ font-size:24px; font-weight:700; }}
.tools button {{ font:inherit; margin-right:6px; padding:4px 10px; border:1px solid #d0d7de; border-radius:6px; background:#fff; cursor:pointer; }}
details.test {{ border:1px solid #d0d7de; border-radius:6px; margin:8px 0; background:#fff; }}
details.test > summary {{ cursor:pointer; list-style:none; display:flex; gap:10px; align-items:baseline; padding:10px 12px; }}
details.test > summary::-webkit-details-marker {{ display:none; }}
details.test > summary::before {{ content:'▸'; color:#656d76; }} details.test[open] > summary::before {{ content:'▾'; }}
details.test[open] > summary {{ border-bottom:1px solid #d8dee4; background:#f6f8fa; }}
.ttl {{ flex:1; }} .score {{ color:#656d76; white-space:nowrap; }}
.body {{ padding:4px 14px 12px; }}
.badge {{ display:inline-block; min-width:58px; text-align:center; border-radius:10px; padding:1px 8px; font-size:12px; font-weight:700; color:#fff; }}
.badge.pass {{ background:#1a7f37; }} .badge.fail {{ background:#cf222e; }} .badge.flaky {{ background:#bf8700; }} .badge.skip {{ background:#6e7781; }}
.verdict {{ border-left:4px solid #d0d7de; padding:6px 12px; margin:12px 0; }} .verdict.pass {{ border-color:#1a7f37; }} .verdict.fail {{ border-color:#cf222e; }}
.vhead {{ margin-bottom:4px; }} h4 {{ margin:12px 0 4px; font-size:13px; }}
pre {{ white-space:pre-wrap; word-break:break-word; background:#f6f8fa; border:1px solid #d8dee4; border-radius:6px; padding:8px 10px; margin:0; max-height:420px; overflow:auto; }}
.reason {{ margin:0; background:#fff8c5; border:1px solid #eac54f; border-radius:6px; padding:8px 10px; }}
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
<div class="card"><div>Avg judge score</div><div class="value">{f'{avg:.2f}/5' if avg is not None else '—'}</div></div>
</div>
<p>{f'<a href="{report_link}">Open full Playwright HTML report</a> · ' if report_link else ''}Click a test to see the prompt, the chatbot answer, the judge score (1–5, pass ≥ {escape(str(PASSING_SCORE))}) and the judge's explanation.</p>
<p class="tools"><button onclick="document.querySelectorAll('details.test').forEach(d=>d.open=true)">Expand all</button><button onclick="document.querySelectorAll('details.test').forEach(d=>d.open=false)">Collapse all</button></p>
<h2>Tests ({len(tests)})</h2>
{rows or '<p>No tests found in the Playwright JSON output.</p>'}
{orphan_html}
<p class="muted small">Raw verdict files: {' · '.join(files) or 'none'}</p>
</body></html>"""


def index_html(history: list[dict]) -> str:
    def key(record):
        try:
            return int(record.get("run_number", 0))
        except Exception:
            return 0
    rows = []
    for h in sorted(history, key=key, reverse=True)[:50]:
        avg = h.get("avg_score")
        failed = h.get("failed", 0) or 0
        rows.append(
            f"<tr><td><a href='runs/{escape(str(h.get('run_number')))}/index.html'>#{escape(str(h.get('run_number')))}</a></td>"
            f"<td>{escape(str(h.get('timestamp', ''))[:19].replace('T', ' '))}</td>"
            f"<td>{escape(str(h.get('passed', 0)))}/{escape(str(h.get('total', 0)))}</td>"
            f"<td class='{'fail' if failed else ''}'>{escape(str(failed))}</td>"
            f"<td>{f'{avg:.2f}' if isinstance(avg, (int, float)) else '—'}</td>"
            f"<td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>LLM Judge Dashboard</title>
<style>body{{font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 auto;max-width:1000px;padding:24px;color:#1f2328}}a{{color:#0969da;text-decoration:none}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px 10px;border-bottom:1px solid #d8dee4;text-align:left}}th{{background:#f6f8fa}}.fail{{color:#cf222e;font-weight:700}}</style>
</head><body><h1>LLM Judge Dashboard</h1><p>Daily chatbot judge verdicts. Open a run to see every prompt, answer, score and judge explanation.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Passed</th><th>Failed</th><th>Avg score</th><th>Commit</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="6">No runs yet.</td></tr>'}</tbody></table></body></html>"""


def main() -> None:
    history = carry_forward()
    llm_root = SITE / "llm-judge"
    run_dir = llm_root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    if Path("playwright-report").exists():
        shutil.copytree("playwright-report", run_dir / "playwright-report", dirs_exist_ok=True)

    reports = playwright_reports()
    stats = playwright_stats(reports)
    tests = collect_tests(reports)
    verdicts = load_jsonl_verdicts() or load_markdown_verdicts()
    orphans = attach_verdicts(tests, verdicts)
    (run_dir / "index.html").write_text(run_html(run_dir, stats, tests, orphans), encoding="utf-8")

    scores = [v.get("score") for v in verdicts if isinstance(v.get("score"), (int, float))]
    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "passed": stats["passed"],
        "failed": stats["failed"],
        "total": sum(stats.values()),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else None,
        "verdicts": len(verdicts),
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    llm_root.mkdir(parents=True, exist_ok=True)
    (llm_root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (llm_root / "index.html").write_text(index_html(history), encoding="utf-8")
    print(f"LLM Judge site: {len(tests)} tests, {len(verdicts)} verdicts, {len(orphans)} unlinked")


if __name__ == "__main__":
    main()
