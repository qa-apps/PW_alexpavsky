#!/usr/bin/env python3
"""Age out failure evidence from the published GitHub Pages branch.

Screenshots, videos and Playwright traces are captured only on failure
(`screenshot: only-on-failure`, `video`/`trace: retain-on-failure`) and are
only worth keeping while someone is still triaging that failure — which is why
the Actions artifacts that mirror them already expire. The published site had
no equivalent rule, so every run's attachments were carried forward forever:
the branch reached 468 MB, of which 379 MB was 52 files, the largest a single
37 MB trace duplicated under two directories in the same run.

This runs against a checkout of the Pages branch and deletes only the
attachments. Every run's HTML and JSON stay, so the dashboard history is never
truncated — a run older than the window keeps its page and its numbers, and
loses only the downloads nobody fetches from a web page anyway.

Age comes from the commit that last touched each run directory, so it works
for every section (llm-judge, vision-audit, k6, promptfoo) without depending
on a per-section history file.

    python3 scripts/prune_pages_media.py gh-pages-checkout [--days 3] [--dry-run]
"""

from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
from pathlib import Path

MEDIA_SUFFIXES = {".zip", ".webm", ".mp4", ".png", ".jpg", ".jpeg"}


def run_dirs(root: Path) -> list[Path]:
    """Every `<section>/runs/<id>` directory in the published site."""
    return sorted(d for d in root.glob("*/runs/*") if d.is_dir())


def last_touched(repo: Path, rel: str) -> dt.datetime | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), "log", "-1", "--format=%cI", "--", rel],
        capture_output=True,
        text=True,
    )
    stamp = proc.stdout.strip()
    if proc.returncode != 0 or not stamp:
        return None
    try:
        return dt.datetime.fromisoformat(stamp)
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("checkout", type=Path, help="path to the gh-pages checkout")
    ap.add_argument("--days", type=int, default=3, help="retention window (default: 3)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = args.checkout
    if not (root / ".git").exists():
        sys.exit(f"{root} is not a git checkout")
    if args.days <= 0:
        sys.exit("--days must be positive; refusing to delete every attachment")

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=args.days)
    removed, freed, kept = 0, 0, 0

    for run_dir in run_dirs(root):
        rel = run_dir.relative_to(root).as_posix()
        touched = last_touched(root, rel)
        if touched is None:
            # Unknown age must never mean "delete".
            kept += 1
            continue
        if touched >= cutoff:
            kept += 1
            continue
        for path in sorted(run_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in MEDIA_SUFFIXES:
                freed += path.stat().st_size
                removed += 1
                if not args.dry_run:
                    path.unlink()

    verb = "would free" if args.dry_run else "freed"
    print(
        f"{'[dry-run] ' if args.dry_run else ''}"
        f"{removed} attachment(s) from runs older than {args.days} day(s); "
        f"{verb} {freed / 1048576:.1f} MB. {kept} run(s) still inside the window."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
