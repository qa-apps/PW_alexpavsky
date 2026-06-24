#!/usr/bin/env python3
"""report_lib.py — schema + read/write helpers for alexpavsky.com QA reports.

A "report" is ONE JSON file per daily run, living in ``reports/<run_date>.json``.
It captures the Codex -> Claude -> Codex loop for that day:

    Codex daily test pass   ->  bugs[]  (+ blockers[] if the run was blocked)
    Claude fixing phase      ->  per-bug claude_fix{}, blockers[].status
    Codex verifying phase    ->  per-bug codex_verdict, codex_final{}

Both agents must mutate reports THROUGH this module (CLI or import) so the shape
never drifts across the handoff. Pure stdlib; Python 3.9+.

CLI quick reference (run `python3 report_lib.py -h`):
    new <date>                       create a fresh skeleton report (status codex_testing)
    list                             one line per report with derived counts
    validate <date|path>             check a report against the schema (exit 1 on error)
    status <date> <status>           move the report along the loop
    headline <date> <text>           update the one-line headline shown on the card
    blocker <date> <id> <state>      open|claude_cleared|resolved_by_design (+ --note/--commit)
    add-bug <date> --id .. --title ..  append a bug Codex found
    claude-fix <date> <bug_id> ..    record the fix Claude applied (--summary/--commit/--files/--verified)
    add-shot <date> <bug_id> ..      attach a screenshot (--file/--src, --kind bug|fix, --caption)
    verdict <date> <bug_id> <v>      Codex's per-bug verdict: fixed|needs_attention|not_reproduced|pending
    final <date> <v> --summary ..    Codex's final verdict: all_clear|attention_needed|pending
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "alexpavsky-qa-report/v1"
ROOT = Path(__file__).resolve().parent
REPORTS_DIR = ROOT / "reports"
SHOTS_DIR = ROOT / "shots"  # one subdir per run_date, served by the UI at /shot/
DEFAULT_SITE = "https://www.alexpavsky.com"

# The report's position in the Codex<->Claude loop.
STATUSES = ["codex_testing", "blocked", "claude_fixing", "codex_verifying", "complete"]
# A blocker is something Codex could not do (DNS, browser, a write path). Claude
# clears it (claude_cleared) or the new design removes it (resolved_by_design).
BLOCKER_STATUSES = ["open", "claude_cleared", "resolved_by_design"]
SEVERITIES = ["major", "minor", "cosmetic"]
CODEX_STATUSES = ["found", "confirmed", "not_reproduced"]
# Codex's verdict on a bug AFTER Claude's fix.
VERDICTS = ["fixed", "needs_attention", "not_reproduced", "pending"]
FINAL_VERDICTS = ["all_clear", "attention_needed", "pending"]
# A screenshot attached to a bug: "bug" = the defect Codex saw, "fix" = the
# verified fixed state Claude observed. Rendered as a clickable thumbnail.
SHOT_KINDS = ["bug", "fix"]

# Where the local report UI lives (mirrors serve.py). After a milestone we pop
# the report open in the browser so Alex sees it without hunting for the URL.
UI_HOST = os.getenv("QA_UI_HOST", "127.0.0.1")
UI_PORT = int(os.getenv("QA_UI_PORT", "5058"))
# Status transitions worth surfacing: run hit a blocker, run clean / fixes done,
# verification finished. These are exactly "after each run / fix / verification".
OPEN_ON_STATUS = {"blocked", "codex_verifying", "complete"}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── paths / io ───────────────────────────────────────────────────────────────
def report_path(run_date: str) -> Path:
    return REPORTS_DIR / f"{run_date}.json"


def resolve(date_or_path: str) -> Path:
    """Accept either a run_date (2026-06-14) or a direct path to a report."""
    p = Path(date_or_path)
    if p.suffix == ".json" or p.exists():
        return p
    return report_path(date_or_path)


def load_report(date_or_path) -> dict:
    return json.loads(resolve(str(date_or_path)).read_text(encoding="utf-8"))


def save_report(report: dict) -> Path:
    report["updated_at"] = _now()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = report_path(report["run_date"])
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def list_reports(reports_dir=REPORTS_DIR) -> list:
    out = []
    d = Path(reports_dir)
    if not d.exists():
        return out
    for fp in sorted(d.glob("*.json")):
        try:
            r = load_report(fp)
        except Exception:  # a half-written report must not crash the viewer
            continue
        r["_counts"] = derive_counts(r)
        out.append(r)
    out.sort(key=lambda r: str(r.get("run_date") or ""), reverse=True)
    return out


# ── browser auto-open ────────────────────────────────────────────────────────
# After a run/fix/verification milestone the report pops open in the browser.
# Best-effort throughout: surfacing the report is a convenience and must never
# break a save or raise. Set QA_UI_NO_OPEN=1 to disable (CI, headless sandboxes).
def report_url(run_date: str) -> str:
    return f"http://{UI_HOST}:{UI_PORT}/r/{run_date}"


def _server_up(timeout: float = 0.3) -> bool:
    try:
        with socket.create_connection((UI_HOST, UI_PORT), timeout=timeout):
            return True
    except OSError:
        return False


def _ensure_server() -> None:
    """Start serve.py detached if nothing is already listening on the UI port."""
    if _server_up():
        return
    serve = ROOT / "serve.py"
    if not serve.is_file():
        return
    subprocess.Popen(
        [sys.executable, str(serve)],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    for _ in range(20):  # wait up to ~2s for it to bind, so the tab isn't refused
        if _server_up():
            return
        time.sleep(0.1)


def _launch_browser(url: str) -> None:
    if sys.platform == "darwin":  # use the OS default browser explicitly
        subprocess.Popen(["open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        webbrowser.open(url)


def open_report(run_date: str) -> None:
    """Open the report for run_date in the default browser (best-effort)."""
    if os.getenv("QA_UI_NO_OPEN"):
        return
    try:
        _ensure_server()
        _launch_browser(report_url(run_date))
    except Exception:
        pass  # never let opening a tab break the report write


# ── derived data ─────────────────────────────────────────────────────────────
def derive_counts(report: dict) -> dict:
    bugs = report.get("bugs") or []
    blockers = report.get("blockers") or []
    return {
        "bugs": len(bugs),
        "claude_fixed": sum(1 for b in bugs if (b.get("claude_fix") or {}).get("done")),
        "verified_fixed": sum(1 for b in bugs if b.get("codex_verdict") == "fixed"),
        "needs_attention": sum(1 for b in bugs if b.get("codex_verdict") == "needs_attention"),
        "not_reproduced": sum(1 for b in bugs if b.get("codex_verdict") == "not_reproduced"),
        "blockers": len(blockers),
        "open_blockers": sum(1 for x in blockers if x.get("status") == "open"),
    }


# ── constructors / mutators ──────────────────────────────────────────────────
def new_report(run_date, site=DEFAULT_SITE, tester="codex", headline="") -> dict:
    return {
        "schema": SCHEMA,
        "run_date": run_date,
        "site": site,
        "status": "codex_testing",
        "headline": headline,
        "tester": tester,
        "blockers": [],
        "bugs": [],
        "codex_final": {"verdict": "pending", "summary": "", "needs_alex": []},
        "created_at": _now(),
        "updated_at": _now(),
    }


def _find_bug(report: dict, bug_id: str) -> dict:
    for b in report.get("bugs") or []:
        if b.get("id") == bug_id:
            return b
    raise KeyError(f"no bug with id {bug_id!r} in {report.get('run_date')}")


def add_bug(report, bug_id, title, section="", severity="minor",
            codex_status="found", evidence=None) -> dict:
    bug = {
        "id": bug_id,
        "title": title,
        "section": section,
        "severity": severity,
        "codex_status": codex_status,
        "evidence": list(evidence or []),
        "shots": [],
        "claude_fix": None,
        "codex_verdict": "pending",
        "codex_verdict_note": "",
    }
    report.setdefault("bugs", []).append(bug)
    return bug


def set_claude_fix(report, bug_id, summary, commit="", files=None,
                   verified="", done=True) -> dict:
    bug = _find_bug(report, bug_id)
    bug["claude_fix"] = {
        "done": bool(done),
        "summary": summary,
        "commit": commit,
        "files": list(files or []),
        "verified": verified,
    }
    return bug


def add_shot(report, bug_id, src, caption="", kind="bug") -> dict:
    """Attach a screenshot to a bug. ``kind`` is 'bug' (the defect) or 'fix'
    (the verified fixed state). ``src`` is a path relative to SHOTS_DIR."""
    bug = _find_bug(report, bug_id)
    shot = {"src": src, "caption": caption, "kind": kind}
    bug.setdefault("shots", []).append(shot)
    return shot


def import_shot_file(run_date, file_path) -> str:
    """Copy an image into ``shots/<run_date>/`` and return its src relative to
    SHOTS_DIR (e.g. '2026-06-14/fix-009-mobile.png'). Keeps the report's images
    next to the report so the UI can serve them with no extra config."""
    src_path = Path(file_path).expanduser().resolve()
    if not src_path.is_file():
        raise FileNotFoundError(f"no such screenshot: {file_path}")
    dest_dir = SHOTS_DIR / run_date
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src_path, dest_dir / src_path.name)
    return f"{run_date}/{src_path.name}"


def set_verdict(report, bug_id, verdict, note="") -> dict:
    bug = _find_bug(report, bug_id)
    bug["codex_verdict"] = verdict
    if note:
        bug["codex_verdict_note"] = note
    return bug


def set_blocker(report, blocker_id, status, title=None, detail=None,
                note="", commit="") -> dict:
    blockers = report.setdefault("blockers", [])
    existing = next((b for b in blockers if b.get("id") == blocker_id), None)
    if existing is None:
        existing = {"id": blocker_id, "title": title or blocker_id, "detail": detail or "",
                    "status": status, "claude_note": note, "claude_commit": commit}
        blockers.append(existing)
    else:
        existing["status"] = status
        if title is not None:
            existing["title"] = title
        if detail is not None:
            existing["detail"] = detail
        if note:
            existing["claude_note"] = note
        if commit:
            existing["claude_commit"] = commit
    return existing


def set_final(report, verdict, summary="", needs_alex=None) -> dict:
    report["codex_final"] = {
        "verdict": verdict,
        "summary": summary,
        "needs_alex": list(needs_alex or []),
    }
    return report["codex_final"]


# ── validation ───────────────────────────────────────────────────────────────
def validate(report: dict) -> list:
    errs = []

    def need(cond, msg):
        if not cond:
            errs.append(msg)

    need(report.get("schema") == SCHEMA, f"schema must be {SCHEMA!r}")
    need(bool(report.get("run_date")), "run_date is required")
    need(report.get("status") in STATUSES, f"status must be one of {STATUSES}")
    for i, b in enumerate(report.get("bugs") or []):
        loc = f"bugs[{i}] ({b.get('id', '?')})"
        need(bool(b.get("id")), f"{loc}: id required")
        need(bool(b.get("title")), f"{loc}: title required")
        need(b.get("severity") in SEVERITIES, f"{loc}: severity must be {SEVERITIES}")
        need(b.get("codex_status") in CODEX_STATUSES, f"{loc}: codex_status must be {CODEX_STATUSES}")
        need(b.get("codex_verdict") in VERDICTS, f"{loc}: codex_verdict must be {VERDICTS}")
        cf = b.get("claude_fix")
        need(cf is None or isinstance(cf, dict), f"{loc}: claude_fix must be an object or null")
        for j, s in enumerate(b.get("shots") or []):
            need(bool(s.get("src")), f"{loc}: shots[{j}].src required")
            need(s.get("kind", "bug") in SHOT_KINDS, f"{loc}: shots[{j}].kind must be {SHOT_KINDS}")
    for i, x in enumerate(report.get("blockers") or []):
        loc = f"blockers[{i}] ({x.get('id', '?')})"
        need(bool(x.get("id")), f"{loc}: id required")
        need(x.get("status") in BLOCKER_STATUSES, f"{loc}: status must be {BLOCKER_STATUSES}")
    fin = report.get("codex_final") or {}
    need(fin.get("verdict") in FINAL_VERDICTS, f"codex_final.verdict must be {FINAL_VERDICTS}")
    return errs


# ── CLI ──────────────────────────────────────────────────────────────────────
def _split_csv(value):
    return [p.strip() for p in (value or "").split(",") if p.strip()]


def _cmd_new(a):
    rep = new_report(a.date, site=a.site, tester=a.tester, headline=a.headline or "")
    save_report(rep)
    print(f"created {report_path(a.date)}")


def _cmd_list(_a):
    reps = list_reports()
    if not reps:
        print("(no reports yet)")
        return
    for r in reps:
        c = r["_counts"]
        print(f"{r['run_date']}  {r['status']:<15}  "
              f"bugs={c['bugs']} fixed={c['claude_fixed']} attn={c['needs_attention']} "
              f"blockers={c['open_blockers']}/{c['blockers']}  {r.get('headline', '')}")


def _cmd_validate(a):
    rep = load_report(a.target)
    errs = validate(rep)
    if errs:
        print(f"INVALID {a.target}:")
        for e in errs:
            print(f"  - {e}")
        sys.exit(1)
    print(f"OK {a.target}")


def _mutate(date, fn):
    rep = load_report(date)
    fn(rep)
    errs = validate(rep)
    if errs:
        print("refusing to save — validation failed:")
        for e in errs:
            print(f"  - {e}")
        sys.exit(1)
    save_report(rep)
    print(f"saved {report_path(date)}")


def _cmd_status(a):
    _mutate(a.date, lambda r: r.update({"status": a.status}))
    if a.status in OPEN_ON_STATUS:
        open_report(a.date)


def _cmd_headline(a):
    _mutate(a.date, lambda r: r.update({"headline": a.text}))


def _cmd_blocker(a):
    _mutate(a.date, lambda r: set_blocker(r, a.id, a.state, title=a.title,
                                          detail=a.detail, note=a.note or "", commit=a.commit or ""))


def _cmd_add_bug(a):
    _mutate(a.date, lambda r: add_bug(r, a.id, a.title, section=a.section or "",
                                      severity=a.severity, codex_status=a.codex_status,
                                      evidence=_split_csv(a.evidence)))


def _cmd_claude_fix(a):
    _mutate(a.date, lambda r: set_claude_fix(r, a.bug, a.summary, commit=a.commit or "",
                                             files=_split_csv(a.files), verified=a.verified or "",
                                             done=not a.not_done))


def _cmd_add_shot(a):
    if a.file:
        src = import_shot_file(a.date, a.file)
    elif a.src:
        src = a.src
    else:
        print("add-shot: pass --file <image path> (copied in) or --src <relpath under shots/>")
        sys.exit(1)
    _mutate(a.date, lambda r: add_shot(r, a.bug, src, caption=a.caption or "", kind=a.kind))


def _cmd_verdict(a):
    _mutate(a.date, lambda r: set_verdict(r, a.bug, a.verdict, note=a.note or ""))


def _cmd_final(a):
    _mutate(a.date, lambda r: set_final(r, a.verdict, summary=a.summary or "",
                                        needs_alex=_split_csv(a.needs_alex)))


def _build_parser():
    p = argparse.ArgumentParser(description="alexpavsky.com QA report store")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("new", help="create a fresh skeleton report")
    s.add_argument("date")
    s.add_argument("--site", default=DEFAULT_SITE)
    s.add_argument("--tester", default="codex")
    s.add_argument("--headline", default="")
    s.set_defaults(func=_cmd_new)

    s = sub.add_parser("list", help="one line per report")
    s.set_defaults(func=_cmd_list)

    s = sub.add_parser("validate", help="check a report against the schema")
    s.add_argument("target")
    s.set_defaults(func=_cmd_validate)

    s = sub.add_parser("status", help="move a report along the loop")
    s.add_argument("date")
    s.add_argument("status", choices=STATUSES)
    s.set_defaults(func=_cmd_status)

    s = sub.add_parser("headline", help="update the report headline")
    s.add_argument("date")
    s.add_argument("text")
    s.set_defaults(func=_cmd_headline)

    s = sub.add_parser("blocker", help="add/update a blocker")
    s.add_argument("date")
    s.add_argument("id")
    s.add_argument("state", choices=BLOCKER_STATUSES)
    s.add_argument("--title")
    s.add_argument("--detail")
    s.add_argument("--note")
    s.add_argument("--commit")
    s.set_defaults(func=_cmd_blocker)

    s = sub.add_parser("add-bug", help="append a bug Codex found")
    s.add_argument("date")
    s.add_argument("--id", required=True)
    s.add_argument("--title", required=True)
    s.add_argument("--section", default="")
    s.add_argument("--severity", choices=SEVERITIES, default="minor")
    s.add_argument("--codex-status", dest="codex_status", choices=CODEX_STATUSES, default="found")
    s.add_argument("--evidence", help="comma-separated evidence lines")
    s.set_defaults(func=_cmd_add_bug)

    s = sub.add_parser("claude-fix", help="record the fix Claude applied")
    s.add_argument("date")
    s.add_argument("bug")
    s.add_argument("--summary", required=True)
    s.add_argument("--commit", default="")
    s.add_argument("--files", help="comma-separated file paths")
    s.add_argument("--verified", help="how the fix was observed working")
    s.add_argument("--not-done", action="store_true", help="record attempt without marking done")
    s.set_defaults(func=_cmd_claude_fix)

    s = sub.add_parser("add-shot", help="attach a screenshot thumbnail to a bug or its fix")
    s.add_argument("date")
    s.add_argument("bug")
    s.add_argument("--file", help="path to an image; copied into shots/<date>/")
    s.add_argument("--src", help="relative path under shots/ if the image is already placed")
    s.add_argument("--caption", default="", help="shown on hover and under the expanded image")
    s.add_argument("--kind", choices=SHOT_KINDS, default="bug",
                   help="'bug' = the defect Codex saw, 'fix' = the verified fixed state")
    s.set_defaults(func=_cmd_add_shot)

    s = sub.add_parser("verdict", help="Codex's per-bug verdict")
    s.add_argument("date")
    s.add_argument("bug")
    s.add_argument("verdict", choices=VERDICTS)
    s.add_argument("--note")
    s.set_defaults(func=_cmd_verdict)

    s = sub.add_parser("final", help="Codex's final verdict for the run")
    s.add_argument("date")
    s.add_argument("verdict", choices=FINAL_VERDICTS)
    s.add_argument("--summary")
    s.add_argument("--needs-alex", dest="needs_alex", help="comma-separated bug ids")
    s.set_defaults(func=_cmd_final)
    return p


def main(argv=None):
    args = _build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
