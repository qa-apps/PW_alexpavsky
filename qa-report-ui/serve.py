#!/usr/bin/env python3
"""serve.py — localhost viewer for alexpavsky.com daily QA reports.

Zero dependencies (Python stdlib only — no Flask, no venv, nothing to break).
Reports are JSON files in ``reports/`` written through ``report_lib.py``.

    python3 serve.py            # -> http://127.0.0.1:5058
    QA_UI_PORT=5060 python3 serve.py

Routes:
    GET /              list of daily reports (newest first)
    GET /r/<run_date>  one report: blockers, bugs (Codex found -> Claude fix ->
                       Codex verdict), and Codex's final verdict
    GET /favicon.svg   shield-check mark
    GET /healthz       "ok"
"""
from __future__ import annotations

import html
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
import report_lib as rl  # noqa: E402

HOST = os.getenv("QA_UI_HOST", "127.0.0.1")
PORT = int(os.getenv("QA_UI_PORT", "5058"))

# ── presentation tables ──────────────────────────────────────────────────────
STATUS_META = {
    "codex_testing": ("Codex testing", "s-test"),
    "blocked": ("Blocked", "s-block"),
    "claude_fixing": ("Claude fixing", "s-fix"),
    "codex_verifying": ("Codex verifying", "s-verify"),
    "complete": ("Complete", "s-done"),
}
SEV_META = {
    "major": ("Major", "sev-major"),
    "minor": ("Minor", "sev-minor"),
    "cosmetic": ("Cosmetic", "sev-cosmetic"),
}
VERDICT_META = {
    "fixed": ("Fixed", "v-fixed"),
    "needs_attention": ("Needs your attention", "v-attn"),
    "not_reproduced": ("Not reproduced", "v-nr"),
    "pending": ("Pending", "v-pending"),
}
BLOCKER_META = {
    "open": ("Open", "b-open"),
    "claude_cleared": ("Cleared by Claude", "b-cleared"),
    "resolved_by_design": ("Resolved by design", "b-design"),
}
FINAL_META = {
    "all_clear": ("All clear", "v-fixed"),
    "attention_needed": ("Your attention needed", "v-attn"),
    "pending": ("Pending", "v-pending"),
}

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">'
    '<stop offset="0" stop-color="#5b9dff"/><stop offset="1" stop-color="#2f6fe0"/></linearGradient></defs>'
    '<rect width="32" height="32" rx="7.5" fill="url(#g)"/>'
    '<path d="M16 5l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V8l8-3z" fill="#fff"/>'
    '<path d="M12.2 16.2l2.6 2.6 5-5.4" fill="none" stroke="#2f6fe0" stroke-width="2.4" '
    'stroke-linecap="round" stroke-linejoin="round"/></svg>'
)

CSS = """
:root{--bg:#e8f0fb;--panel:#fff;--panel2:#eef3fb;--line:#d3dff0;--ink:#1c2733;
--muted:#5c6a7d;--accent:#2f6fe0;--great:#1f9d57;--weak:#d08a1e;--bad:#8a96a6;
--danger:#c0392b;--indigo:#6b54c8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:22px}
header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}
h1{font-size:20px;margin:0;letter-spacing:.3px}h1 .dot{color:var(--accent)}
.sub{color:var(--muted);font-size:12.5px}
.meta{margin-left:auto;color:var(--muted);font-size:12.5px;text-align:right}
.crumbs{margin:4px 0 16px;font-size:12.5px;color:var(--muted)}
.flow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:14px 0 18px;
color:var(--muted);font-size:11.5px}
.flow .step{padding:3px 9px;border-radius:999px;background:var(--panel2);border:1px solid var(--line)}
.flow .step.on{background:#e4edfc;border-color:var(--accent);color:var(--accent);font-weight:650}
.flow .arrow{color:#aab8c8}
.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:650;
border:1px solid var(--line);background:var(--panel2);color:var(--muted);white-space:nowrap}
.s-test{color:#2f6fe0;border-color:#aac6f3;background:#e6efff}
.s-block{color:#fff;border-color:var(--danger);background:var(--danger)}
.s-fix{color:#8a5a06;border-color:#e6cf94;background:#fbf0d8}
.s-verify{color:#fff;border-color:var(--indigo);background:var(--indigo)}
.s-done{color:#fff;border-color:var(--great);background:var(--great)}
.sev-major{color:#fff;background:var(--danger);border-color:var(--danger)}
.sev-minor{color:#8a5a06;background:#fbf0d8;border-color:#e6cf94}
.sev-cosmetic{color:var(--muted);background:var(--panel2)}
.v-fixed{color:#fff;background:var(--great);border-color:var(--great)}
.v-attn{color:#fff;background:var(--danger);border-color:var(--danger)}
.v-nr{color:#42566b;background:#dfe8f4;border-color:#c3d4ea}
.v-pending{color:var(--muted);background:var(--panel2)}
.b-open{color:#fff;background:var(--danger);border-color:var(--danger)}
.b-cleared{color:#fff;background:var(--great);border-color:var(--great)}
.b-design{color:#3a4f86;background:#e6ecfb;border-color:#c3d0ef}
/* report cards (list) */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:13px;margin-top:6px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:15px 16px;
border-left:3px solid var(--accent)}
.card.blocked{border-left-color:var(--danger)}
.card.complete{border-left-color:var(--great)}
.card.claude_fixing{border-left-color:var(--weak)}
.card.codex_verifying{border-left-color:var(--indigo)}
.card-h{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.card-h .date{font-weight:700;font-size:16px}
.card-h .badge{margin-left:auto}
.card .headline{color:var(--ink);font-size:13px;margin:2px 0 12px;min-height:34px;
display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:7px;font-size:12px;
background:var(--panel2);border:1px solid var(--line);color:var(--ink);font-variant-numeric:tabular-nums}
.chip.attn{color:var(--danger);border-color:#f0c2c2;background:#fdeaea}
.chip.fixed{color:#1c6b3f;border-color:#b6e3c7;background:#e3f6ea}
.chip.block{color:var(--danger);border-color:#f0c2c2;background:#fdeaea}
/* panels + table (detail) */
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:14px 0}
.panel h2{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:0 0 12px}
.kv{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--muted);font-size:12.5px;margin-top:2px}
.kv b{color:var(--ink);font-weight:600}
.blk{border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:9px;background:var(--panel2)}
.blk:last-child{margin-bottom:0}
.blk-h{display:flex;align-items:center;gap:9px}
.blk-h .t{font-weight:650}.blk-h .badge{margin-left:auto}
.blk .detail{color:var(--muted);font-size:12px;margin-top:6px;white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace}
.blk .note{font-size:12.5px;margin-top:7px}.blk .note b{color:var(--great)}
table{width:100%;border-collapse:collapse;margin-top:2px}
th,td{text-align:left;padding:11px 11px;border-bottom:1px solid var(--line);vertical-align:top;font-size:13px}
th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
tr:last-child td{border-bottom:none}
.bug-t{font-weight:600}.bug-s{color:var(--muted);font-size:11.5px}
.cell-found{max-width:230px;color:var(--muted);font-size:12px}
.cell-found ul{margin:5px 0 0;padding-left:16px}.cell-found li{margin:2px 0}
.fix{font-size:12.5px}.fix .sum{color:var(--ink)}
.fix .ev{color:var(--great);font-size:11.5px;margin-top:3px}
.fix .src{color:var(--muted);font-size:11.5px;margin-top:2px;font-family:ui-monospace,Menlo,Consolas,monospace}
.muted{color:var(--muted)}
.vnote{color:var(--muted);font-size:11.5px;margin-top:5px;max-width:200px}
.final{font-size:14px}.final .sum{margin-top:10px;line-height:1.55}
.empty{padding:42px;text-align:center;color:var(--muted)}
.back{font-size:12.5px}
/* screenshot thumbnails + lightbox */
.shots{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.thumb{display:block;width:66px;height:46px;border:1px solid var(--line);border-radius:6px;
overflow:hidden;cursor:zoom-in;background:var(--panel2);flex:0 0 auto;padding:0;line-height:0}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb:hover{border-color:var(--accent)}
.lb{position:fixed;inset:0;background:rgba(15,23,36,.85);z-index:60;display:none;
flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:28px;cursor:zoom-out}
.lb.show{display:flex}
.lb img{max-width:95vw;max-height:86vh;border-radius:8px;box-shadow:0 14px 50px rgba(0,0,0,.55);background:#fff}
.lb-cap{color:#e8f0fb;font-size:13px;max-width:80vw;text-align:center;line-height:1.5}
"""

# Full-screen overlay + the tiny script that drives it. A thumbnail carries its
# full-size src and caption in data-* attributes; clicking it fills and shows the
# overlay. Clicking the overlay (or pressing Escape) closes it. No dependencies.
LIGHTBOX = (
    '<div id="lb" class="lb" onclick="closeLb()">'
    '<img id="lbimg" src="" alt=""><div id="lbcap" class="lb-cap"></div></div>'
    "<script>"
    "function zoom(el){var lb=document.getElementById('lb');"
    "document.getElementById('lbimg').src=el.dataset.full;"
    "document.getElementById('lbcap').textContent=el.dataset.cap||'';"
    "lb.classList.add('show');}"
    "function closeLb(){document.getElementById('lb').classList.remove('show');}"
    "document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLb();});"
    "</script>"
)


def esc(x) -> str:
    return html.escape("" if x is None else str(x))


def badge(text, cls) -> str:
    return f'<span class="badge {esc(cls)}">{esc(text)}</span>'


def status_badge(status) -> str:
    label, cls = STATUS_META.get(status, (status, ""))
    return badge(label, cls)


def page(title, body) -> str:
    return (
        "<!doctype html><html lang=en><head><meta charset=utf-8>"
        '<meta name=viewport content="width=device-width, initial-scale=1">'
        f"<title>{esc(title)}</title>"
        "<link rel=icon type=image/svg+xml href=/favicon.svg>"
        f"<style>{CSS}</style></head><body><div class=wrap>{body}</div>"
        f"{LIGHTBOX}</body></html>"
    )


# ── loop progress strip ──────────────────────────────────────────────────────
_FLOW = [
    ("codex_testing", "Codex tests"),
    ("claude_fixing", "Claude fixes"),
    ("codex_verifying", "Codex verifies"),
    ("complete", "Final verdict"),
]


def flow_strip(status) -> str:
    # "blocked" lights the Codex-tests step (that's where the run stalled).
    active = "codex_testing" if status == "blocked" else status
    out = ['<div class="flow">']
    for i, (key, label) in enumerate(_FLOW):
        if i:
            out.append('<span class="arrow">&rsaquo;</span>')
        on = " on" if key == active else ""
        suffix = " (blocked)" if (key == "codex_testing" and status == "blocked") else ""
        out.append(f'<span class="step{on}">{esc(label)}{esc(suffix)}</span>')
    out.append("</div>")
    return "".join(out)


# ── list page ────────────────────────────────────────────────────────────────
def render_list(reports) -> str:
    head = (
        "<header><h1>alexpavsky<span class=dot>·</span>QA</h1>"
        "<span class=sub>daily website testing — Codex finds, Claude fixes, Codex verifies</span>"
        f"<span class=meta>{len(reports)} report(s)<br>www.alexpavsky.com</span></header>"
    )
    if not reports:
        return page("alexpavsky · QA reports",
                    head + '<div class="empty">No reports yet. Codex writes one per daily run into '
                           '<code>reports/</code>.</div>')
    cards = []
    for r in reports:
        c = r["_counts"]
        status = r.get("status", "")
        chips = [f'<span class="chip">{c["bugs"]} bug{"s" if c["bugs"] != 1 else ""}</span>']
        if c["claude_fixed"]:
            chips.append(f'<span class="chip fixed">{c["claude_fixed"]} Claude-fixed</span>')
        if c["needs_attention"]:
            chips.append(f'<span class="chip attn">{c["needs_attention"]} need you</span>')
        if c["open_blockers"]:
            chips.append(f'<span class="chip block">{c["open_blockers"]} blocker'
                         f'{"s" if c["open_blockers"] != 1 else ""}</span>')
        cards.append(
            f'<a class="card {esc(status)}" href="/r/{esc(r["run_date"])}">'
            f'<div class="card-h"><span class="date">{esc(r["run_date"])}</span>'
            f"{status_badge(status)}</div>"
            f'<div class="headline">{esc(r.get("headline") or "—")}</div>'
            f'<div class="chips">{"".join(chips)}</div></a>'
        )
    return page("alexpavsky · QA reports", head + f'<div class="cards">{"".join(cards)}</div>')


# ── detail page ──────────────────────────────────────────────────────────────
def render_blockers(report) -> str:
    blockers = report.get("blockers") or []
    if not blockers:
        return ""
    rows = []
    for b in blockers:
        label, cls = BLOCKER_META.get(b.get("status"), (b.get("status"), ""))
        note = ""
        if b.get("claude_note"):
            commit = f' <span class="src">{esc(b["claude_commit"])}</span>' if b.get("claude_commit") else ""
            note = f'<div class="note"><b>Claude:</b> {esc(b["claude_note"])}{commit}</div>'
        detail = f'<div class="detail">{esc(b["detail"])}</div>' if b.get("detail") else ""
        rows.append(
            f'<div class="blk"><div class="blk-h"><span class="t">{esc(b.get("title"))}</span>'
            f"{badge(label, cls)}</div>{detail}{note}</div>"
        )
    return f'<div class="panel"><h2>Blockers Codex hit</h2>{"".join(rows)}</div>'


def shots_html(shots, kind) -> str:
    """A row of clickable thumbnails for shots of the given kind ('bug'|'fix')."""
    items = [s for s in (shots or []) if s.get("kind", "bug") == kind]
    if not items:
        return ""
    cells = []
    for s in items:
        src = esc("/shot/" + (s.get("src") or ""))
        cap = esc(s.get("caption") or "")
        cells.append(
            f'<span class="thumb" data-full="{src}" data-cap="{cap}" onclick="zoom(this)">'
            f'<img src="{src}" loading="lazy" alt="{cap}"></span>'
        )
    return f'<div class="shots">{"".join(cells)}</div>'


def render_bug_row(b) -> str:
    sev_label, sev_cls = SEV_META.get(b.get("severity"), (b.get("severity"), ""))
    # Codex found
    ev = b.get("evidence") or []
    ev_html = ""
    if ev:
        items = "".join(f"<li>{esc(e)}</li>" for e in ev[:4])
        ev_html = f"<ul>{items}</ul>"
    found = f'<span class="badge v-pending">{esc(b.get("codex_status"))}</span>{ev_html}'
    # Claude fix
    cf = b.get("claude_fix")
    if cf and cf.get("done"):
        commit = f' · <span class="src">{esc(cf["commit"])}</span>' if cf.get("commit") else ""
        files = f' · {esc(", ".join(cf.get("files") or []))}' if cf.get("files") else ""
        ev_line = f'<div class="ev">✓ {esc(cf["verified"])}</div>' if cf.get("verified") else ""
        fix = (f'<div class="fix"><div class="sum">{esc(cf.get("summary"))}</div>'
               f'<div class="src">{commit}{files}</div>{ev_line}</div>')
    elif cf:
        fix = f'<div class="fix muted">attempted — {esc(cf.get("summary"))}</div>'
    else:
        fix = '<span class="muted">—</span>'
    # Codex verdict
    v_label, v_cls = VERDICT_META.get(b.get("codex_verdict"), (b.get("codex_verdict"), ""))
    vnote = f'<div class="vnote">{esc(b["codex_verdict_note"])}</div>' if b.get("codex_verdict_note") else ""
    verdict = f"{badge(v_label, v_cls)}{vnote}"
    return (
        "<tr>"
        f'<td><span class="badge {esc(sev_cls)}">{esc(sev_label)}</span></td>'
        f'<td><div class="bug-t">{esc(b.get("title"))}</div>'
        f'<div class="bug-s">{esc(b.get("section"))} · {esc(b.get("id"))}</div></td>'
        f'<td class="cell-found">{found}{shots_html(b.get("shots"), "bug")}</td>'
        f'<td>{fix}{shots_html(b.get("shots"), "fix")}</td>'
        f"<td>{verdict}</td>"
        "</tr>"
    )


def render_detail(report) -> str:
    c = rl.derive_counts(report)
    head = (
        '<div class="crumbs"><a class="back" href="/">&larr; all reports</a></div>'
        f'<header><h1>QA report <span class=dot>·</span> {esc(report["run_date"])}</h1>'
        f"{status_badge(report.get('status'))}"
        f'<span class=meta>tester: {esc(report.get("tester"))}<br>'
        f'updated {esc(report.get("updated_at"))}</span></header>'
        f'<div class="kv"><span><b>{esc(report.get("site"))}</b></span>'
        f'<span>{c["bugs"]} bug(s)</span><span>{c["claude_fixed"]} Claude-fixed</span>'
        f'<span>{c["verified_fixed"]} verified fixed</span>'
        f'<span>{c["needs_attention"]} need attention</span></div>'
    )
    flow = flow_strip(report.get("status"))
    headline = f'<div class="panel"><h2>Summary</h2><div>{esc(report.get("headline") or "—")}</div></div>'
    blockers = render_blockers(report)
    bugs = report.get("bugs") or []
    if bugs:
        rows = "".join(render_bug_row(b) for b in bugs)
        bugs_panel = (
            '<div class="panel"><h2>Bugs — found, fixed, verified</h2>'
            "<table><thead><tr><th>Severity</th><th>Bug</th><th>Codex found</th>"
            "<th>Claude's fix</th><th>Codex verdict</th></tr></thead>"
            f"<tbody>{rows}</tbody></table></div>"
        )
    else:
        bugs_panel = '<div class="panel"><h2>Bugs</h2><div class="muted">No bugs recorded for this run.</div></div>'
    fin = report.get("codex_final") or {}
    f_label, f_cls = FINAL_META.get(fin.get("verdict"), (fin.get("verdict"), "v-pending"))
    needs = fin.get("needs_alex") or []
    needs_html = ""
    if needs:
        needs_html = ('<div class="kv" style="margin-top:10px"><span><b>Still needs you:</b> '
                      f'{esc(", ".join(needs))}</span></div>')
    final_panel = (
        '<div class="panel final"><h2>Codex final verdict</h2>'
        f"{badge(f_label, f_cls)}"
        f'<div class="sum">{esc(fin.get("summary") or "—")}</div>{needs_html}</div>'
    )
    return page(
        f'QA report · {report["run_date"]}',
        head + flow + headline + blockers + bugs_panel + final_panel,
    )


# ── http ─────────────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "alexpavsky-qa-ui"

    def _send(self, body, status=200, ctype="text/html; charset=utf-8"):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _send_shot(self, rel):
        # Serve an image from SHOTS_DIR. Resolve and confirm it stays inside the
        # dir so a crafted /shot/../.. path can't read arbitrary files.
        base = rl.SHOTS_DIR.resolve()
        target = (base / rel).resolve()
        if target != base and base not in target.parents:
            self._send("forbidden", status=403, ctype="text/plain; charset=utf-8")
            return
        if not target.is_file():
            self._send("not found", status=404, ctype="text/plain; charset=utf-8")
            return
        ctype = {
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
        }.get(target.suffix.lower(), "application/octet-stream")
        self._send(target.read_bytes(), ctype=ctype)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        try:
            if path == "/":
                self._send(render_list(rl.list_reports()))
            elif path == "/healthz":
                self._send("ok", ctype="text/plain; charset=utf-8")
            elif path == "/favicon.svg":
                self._send(FAVICON_SVG, ctype="image/svg+xml")
            elif path.startswith("/shot/"):
                self._send_shot(path[len("/shot/"):])
            elif path.startswith("/r/"):
                run_date = path[3:].strip("/")
                fp = rl.report_path(run_date)
                if not fp.exists():
                    self._send(page("Not found", '<div class="empty">No report for that date. '
                                                 '<a href="/">Back</a></div>'), status=404)
                    return
                self._send(render_detail(rl.load_report(run_date)))
            else:
                self._send(page("Not found", '<div class="empty">Not found. <a href="/">Back</a></div>'),
                           status=404)
        except Exception as exc:  # never 500 silently — show the error locally
            self._send(page("Error", f'<div class="empty">Error: {esc(exc)}<br>'
                                     '<a href="/">Back</a></div>'), status=500)

    def log_message(self, *_args):  # quiet; this is a personal localhost tool
        pass


def main():
    rl.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"alexpavsky QA reports on http://{HOST}:{PORT}  (reports dir: {rl.REPORTS_DIR})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    main()
