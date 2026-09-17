#!/usr/bin/env python3
"""Build a static GitHub Pages UI for k6 results.

Summary numbers come from `k6 run --summary-export performance-results/k6-<profile>.json`.
Per-call details come from `k6 run --out json=performance-results/k6-<profile>-calls.json.gz`
(k6 NDJSON output): one http_req_duration point per HTTP call plus check points.
Each profile row on the run page links to its call trace: every call with its
endpoint, method, status, duration and OK/FAIL, a per-endpoint breakdown and
check pass rates.
"""
from __future__ import annotations

import datetime as dt
import gzip
import json
import os
import shutil
from collections import defaultdict
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
MAX_CALL_ROWS = int(os.environ.get("K6_MAX_CALL_ROWS", "5000"))


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


def _open_calls_file(profile: str):
    for name in (f"k6-{profile}-calls.json.gz", f"k6-{profile}-calls.json"):
        path = RESULTS_DIR / name
        if path.exists():
            return gzip.open(path, "rt", encoding="utf-8") if path.suffix == ".gz" else path.open(encoding="utf-8")
    return None


def _parse_time(value: str) -> dt.datetime | None:
    # k6 writes RFC3339 with nanoseconds; trim to microseconds for fromisoformat.
    try:
        head, _, tail = value.partition(".")
        frac, tz = tail, ""
        for sep in ("Z", "+", "-"):
            if sep in tail:
                idx = tail.index(sep)
                frac, tz = tail[:idx], tail[idx:]
                break
        tz = "+00:00" if tz in ("", "Z") else tz
        return dt.datetime.fromisoformat(f"{head}.{(frac or '0')[:6].ljust(6, '0')}{tz}")
    except Exception:
        return None


def load_calls(profile: str) -> dict | None:
    fh = _open_calls_file(profile)
    if fh is None:
        return None
    calls: list[dict] = []
    checks: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    with fh:
        for line in fh:
            if '"Point"' not in line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if item.get("type") != "Point":
                continue
            data = item.get("data") or {}
            tags = data.get("tags") or {}
            name = item.get("metric")
            if name == "http_req_duration":
                calls.append({
                    "time": data.get("time", ""),
                    "endpoint": tags.get("endpoint") or tags.get("group", "").strip(":") or "request",
                    "method": tags.get("method", ""),
                    "route": tags.get("route") or tags.get("name") or tags.get("url", ""),
                    "status": tags.get("status", ""),
                    "ok": tags.get("expected_response", "true") == "true",
                    "error": tags.get("error", "") or tags.get("error_code", ""),
                    "duration_ms": float(data.get("value") or 0),
                })
            elif name == "checks":
                counter = checks[tags.get("check", "check")]
                counter[0 if float(data.get("value") or 0) >= 1 else 1] += 1
    calls.sort(key=lambda c: c["time"])
    start = _parse_time(calls[0]["time"]) if calls else None
    for i, c in enumerate(calls, start=1):
        c["n"] = i
        t = _parse_time(c["time"])
        c["offset_s"] = (t - start).total_seconds() if (t and start) else None
    return {"calls": calls, "checks": dict(checks)}


def _pct(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = max(0, min(len(ordered) - 1, int(round(q * (len(ordered) - 1)))))
    return ordered[k]


def endpoint_rows(calls: list[dict]) -> str:
    groups: dict[str, list[dict]] = defaultdict(list)
    for c in calls:
        groups[f"{c['method']} {c['endpoint']} ({c['route']})"].append(c)
    rows = []
    for key in sorted(groups, key=lambda k: -len(groups[k])):
        items = groups[key]
        durs = [c["duration_ms"] for c in items]
        ok = sum(1 for c in items if c["ok"])
        statuses: dict[str, int] = defaultdict(int)
        for c in items:
            statuses[c["status"] or "error"] += 1
        status_txt = ", ".join(f"{s}×{n}" for s, n in sorted(statuses.items()))
        rows.append(
            f"<tr><td>{escape(key)}</td><td>{len(items)}</td>"
            f"<td class='ok'>{ok}</td><td class='{'bad' if len(items) - ok else ''}'>{len(items) - ok}</td>"
            f"<td>{escape(status_txt)}</td><td>{sum(durs) / len(durs):.0f} ms</td>"
            f"<td>{_pct(durs, 0.95):.0f} ms</td><td>{max(durs):.0f} ms</td></tr>"
        )
    return "".join(rows)


def check_rows(checks: dict[str, list[int]]) -> str:
    rows = []
    for name in sorted(checks):
        passed, failed = checks[name]
        total = passed + failed
        rate = (passed / total * 100) if total else 0
        rows.append(
            f"<tr><td>{escape(name)}</td><td class='ok'>{passed}</td>"
            f"<td class='{'bad' if failed else ''}'>{failed}</td><td>{rate:.2f}%</td></tr>"
        )
    return "".join(rows)


def call_rows(calls: list[dict]) -> str:
    rows = []
    for c in calls[:MAX_CALL_ROWS]:
        offset = f"+{c['offset_s']:.3f}s" if c.get("offset_s") is not None else escape(c["time"])
        result = "<span class='ok'>OK</span>" if c["ok"] else "<span class='bad'>FAIL</span>"
        err = f" <span class='muted'>{escape(c['error'])}</span>" if c.get("error") else ""
        rows.append(
            f"<tr class='{'' if c['ok'] else 'failrow'}'><td>{c['n']}</td><td>{offset}</td>"
            f"<td>{escape(c['endpoint'])}</td><td>{escape(c['method'])}</td><td>{escape(c['route'])}</td>"
            f"<td>{escape(c['status'] or '—')}</td><td>{c['duration_ms']:.0f} ms</td><td>{result}{err}</td></tr>"
        )
    return "".join(rows)


def profile_section(result: dict, details: dict | None) -> str:
    profile = result["profile"]
    anchor = f"calls-{escape(profile)}"
    if details is None:
        return (
            f"<details class='prof' id='{anchor}'><summary><b>{escape(profile)}</b> — call trace not recorded "
            "for this run</summary><div class='body'><p class='muted'>Runs before per-call tracing was enabled only "
            "kept the k6 summary.</p></div></details>"
        )
    calls = details["calls"]
    failed = sum(1 for c in calls if not c["ok"])
    more = (
        f"<p class='muted'>Showing the first {MAX_CALL_ROWS} of {len(calls)} calls.</p>"
        if len(calls) > MAX_CALL_ROWS else ""
    )
    return f"""<details class='prof' id='{anchor}'{' open' if failed else ''}>
<summary><b>{escape(profile)}</b> — {len(calls)} calls · <span class='ok'>{len(calls) - failed} OK</span> · <span class='{'bad' if failed else 'muted'}'>{failed} failed</span></summary>
<div class='body'>
<h3>Per endpoint</h3>
<table><thead><tr><th>Endpoint</th><th>Calls</th><th>OK</th><th>Failed</th><th>Status codes</th><th>Avg</th><th>p95</th><th>Max</th></tr></thead>
<tbody>{endpoint_rows(calls) or '<tr><td colspan="8">No calls.</td></tr>'}</tbody></table>
<h3>Checks</h3>
<table><thead><tr><th>Check</th><th>Passed</th><th>Failed</th><th>Pass rate</th></tr></thead>
<tbody>{check_rows(details['checks']) or '<tr><td colspan="4">No checks recorded.</td></tr>'}</tbody></table>
<h3>All calls</h3>
<p><label><input type="checkbox" onchange="this.closest('.body').querySelector('table.calls').classList.toggle('onlyfail', this.checked)"> show only failed calls</label></p>
<div class='scroll'><table class='calls'><thead><tr><th>#</th><th>Time</th><th>Endpoint</th><th>Method</th><th>Route</th><th>Status</th><th>Duration</th><th>Result</th></tr></thead>
<tbody>{call_rows(calls)}</tbody></table></div>
{more}
</div></details>"""


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


def run_html(results: list[dict], details: dict[str, dict | None]) -> str:
    rows = []
    for r in results:
        d = details.get(r["profile"])
        calls_txt = f"{len(d['calls'])} calls →" if d else "summary only"
        rows.append(
            "<tr>"
            f"<td><a href='#calls-{escape(r['profile'])}' onclick=\"document.getElementById('calls-{escape(r['profile'])}').open=true\">{escape(r['profile'])}</a></td>"
            f"<td>{r['p95']:.0f} ms</td><td>{r['p99']:.0f} ms</td><td>{r['avg']:.0f} ms</td>"
            f"<td>{r['rps']:.1f}</td><td>{int(r['requests'])}</td>"
            f"<td>{r['fail_rate'] * 100:.2f}%</td><td>{r['checks'] * 100:.2f}%</td><td>{int(r['dropped'])}</td>"
            f"<td><a href='#calls-{escape(r['profile'])}' onclick=\"document.getElementById('calls-{escape(r['profile'])}').open=true\">{calls_txt}</a></td>"
            "</tr>"
        )
    sections = "".join(profile_section(r, details.get(r["profile"])) for r in results)
    run_link = f"https://github.com/{REPO_SLUG}/actions/runs/{RUN_ID}" if RUN_ID else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>k6 run #{escape(str(RUN_NUMBER))}</title>
<style>
body {{ font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif; margin:0 auto; max-width:1200px; padding:24px; color:#1f2328; }}
a {{ color:#0969da; text-decoration:none; }} .meta, .muted {{ color:#656d76; }}
table {{ width:100%; border-collapse:collapse; margin-top:10px; }} th,td {{ padding:6px 10px; border-bottom:1px solid #d8dee4; text-align:left; }}
th {{ background:#f6f8fa; position:sticky; top:0; }}
.ok {{ color:#1a7f37; font-weight:600; }} .bad {{ color:#cf222e; font-weight:700; }} tr.failrow td {{ background:#ffebe9; }}
details.prof {{ border:1px solid #d0d7de; border-radius:6px; margin:12px 0; }}
details.prof > summary {{ cursor:pointer; padding:10px 12px; background:#f6f8fa; }}
.body {{ padding:4px 14px 12px; }} h3 {{ margin:16px 0 4px; font-size:14px; }}
.scroll {{ max-height:520px; overflow:auto; border:1px solid #d8dee4; border-radius:6px; }}
table.calls.onlyfail tbody tr:not(.failrow) {{ display:none; }}
</style></head><body>
<p><a href="../../index.html">← all k6 runs</a></p>
<h1>k6 Performance #{escape(str(RUN_NUMBER))}</h1>
<p class="meta">{escape(TIMESTAMP)} · commit {escape(COMMIT_SHA or 'unknown')} · {f'<a href="{run_link}">GitHub run</a>' if run_link else 'local run'}</p>
<table><thead><tr><th>Profile</th><th>p95</th><th>p99</th><th>Avg</th><th>RPS</th><th>Requests</th><th>Fail rate</th><th>Checks</th><th>Dropped</th><th>Call trace</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="10">No k6 results produced.</td></tr>'}</tbody></table>
<h2>Call traces</h2>
<p class="muted">Click a profile to see every HTTP call k6 made: endpoint, status, duration and whether it met the expected response.</p>
{sections or '<p>No k6 results produced.</p>'}
</body></html>"""


def index_html(history: list[dict]) -> str:
    def key(record):
        try:
            return int(record.get("run_number", 0))
        except Exception:
            return 0
    rows = []
    for h in sorted(history, key=key, reverse=True)[:50]:
        failed = h.get("failed_calls")
        rows.append(
            f"<tr><td><a href='runs/{escape(str(h.get('run_number')))}/index.html'>#{escape(str(h.get('run_number')))}</a></td>"
            f"<td>{escape(str(h.get('timestamp', ''))[:19].replace('T', ' '))}</td>"
            f"<td>{escape(str(h.get('profiles', 0)))}</td><td>{escape(str(h.get('requests', 0)))}</td>"
            f"<td class='{'bad' if failed else ''}'>{escape(str(failed)) if failed is not None else '—'}</td>"
            f"<td>{escape(str(h.get('max_p95_ms', 0)))} ms</td><td>{escape(str(h.get('commit', '')))}</td></tr>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>k6 Dashboard</title>
<style>body{{font:14px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 auto;max-width:1000px;padding:24px;color:#1f2328}}a{{color:#0969da;text-decoration:none}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px 10px;border-bottom:1px solid #d8dee4;text-align:left}}th{{background:#f6f8fa}}.bad{{color:#cf222e;font-weight:700}}</style>
</head><body><h1>k6 Performance Dashboard</h1><p>Latest public performance profiles. Open a run to see every call.</p>
<table><thead><tr><th>Run</th><th>Timestamp UTC</th><th>Profiles</th><th>Requests</th><th>Failed calls</th><th>Worst p95</th><th>Commit</th></tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="7">No runs yet.</td></tr>'}</tbody></table></body></html>"""


def main() -> None:
    history = carry_forward()
    results = load_results()
    details = {r["profile"]: load_calls(r["profile"]) for r in results}
    k6_root = SITE / "k6"
    run_dir = k6_root / "runs" / str(RUN_NUMBER)
    run_dir.mkdir(parents=True, exist_ok=True)
    if RESULTS_DIR.exists():
        # Raw NDJSON call streams are large; publish a compact per-profile JSON instead.
        shutil.copytree(RESULTS_DIR, run_dir / "raw", dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("*-calls.json*"))
        for profile, d in details.items():
            if d is not None:
                (run_dir / "raw" / f"k6-{profile}-calls-compact.json").write_text(
                    json.dumps(d, separators=(",", ":")), encoding="utf-8")
    (run_dir / "index.html").write_text(run_html(results, details), encoding="utf-8")

    traced = [d for d in details.values() if d is not None]
    record = {
        "run_number": RUN_NUMBER,
        "timestamp": TIMESTAMP,
        "profiles": len(results),
        "requests": int(sum(r["requests"] for r in results)),
        "failed_calls": sum(1 for d in traced for c in d["calls"] if not c["ok"]) if traced else None,
        "max_p95_ms": int(max((r["p95"] for r in results), default=0)),
        "commit": COMMIT_SHA,
        "run_id": RUN_ID,
    }
    history = [h for h in history if str(h.get("run_number")) != str(RUN_NUMBER)]
    history.append(record)
    k6_root.mkdir(parents=True, exist_ok=True)
    (k6_root / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (k6_root / "index.html").write_text(index_html(history), encoding="utf-8")
    print(f"k6 site: {len(results)} profiles, {sum(len(d['calls']) for d in traced)} traced calls")


if __name__ == "__main__":
    main()
