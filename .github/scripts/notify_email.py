#!/usr/bin/env python3
"""Send a failure-only CI email, tagged with a severity tier.

This is the SINGLE email path for the QA pipelines. GitHub's native Actions
emails are disabled, so every workflow calls this script ONLY on failure
(`if: failure()`); the inbox then contains real failures and nothing else.

The script no-ops (exit 0) when MAIL_TO / MAIL_SERVER are not configured, so it
is safe to wire into every workflow before the mail secrets exist. Email errors
never fail the job — delivery is best-effort.

Usage:
  python notify_email.py --severity critical --pipeline "Playwright CI" \
      --status failure --run-url "$RUN_URL"

Severity tiers (caller decides which applies to its pipeline):
  critical  blocking/deterministic gate broke, site or deploy is down,
            a security/prompt-injection regression
  major     an eval gate failed (LLM quality, RAG faithfulness, k6 regression)
  minor     non-blocking/flaky-only failure worth an FYI

Env (all from CI secrets / context):
  MAIL_TO, MAIL_SERVER, MAIL_PORT (default 587), MAIL_USERNAME, MAIL_PASSWORD
  GITHUB_REPOSITORY, GITHUB_REF_NAME, GITHUB_EVENT_NAME, GITHUB_ACTOR (context)
"""
from __future__ import annotations

import argparse
import os
import smtplib
import sys
from email.mime.text import MIMEText

SEVERITY_TIERS = ("critical", "major", "minor")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--severity", default="major", choices=SEVERITY_TIERS)
    parser.add_argument("--pipeline", required=True)
    parser.add_argument("--status", default="failure")
    parser.add_argument("--run-url", default=os.environ.get("RUN_URL", ""))
    parser.add_argument("--details", default="")
    args = parser.parse_args()

    mail_to = os.environ.get("MAIL_TO", "").strip()
    mail_server = os.environ.get("MAIL_SERVER", "").strip()
    if not mail_to or not mail_server:
        print("Email secrets not configured (MAIL_TO/MAIL_SERVER). Skipping email.")
        return 0

    username = os.environ.get("MAIL_USERNAME", "").strip()
    password = os.environ.get("MAIL_PASSWORD", "")
    port = int(os.environ.get("MAIL_PORT") or 587)

    repo = os.environ.get("GITHUB_REPOSITORY", "")
    branch = os.environ.get("GITHUB_REF_NAME", "")
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    actor = os.environ.get("GITHUB_ACTOR", "")

    severity = args.severity.upper()
    subject = f"[{severity}] {args.pipeline} failed — {repo} ({branch})"
    body = (
        f"{args.pipeline} failed.\n\n"
        f"Severity   : {severity}\n"
        f"Status     : {args.status}\n"
        f"Repository : {repo}\n"
        f"Branch     : {branch}\n"
        f"Event      : {event}\n"
        f"Actor      : {actor}\n"
        f"Run URL    : {args.run_url}\n"
    )
    if args.details:
        body += f"\n{args.details}\n"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"QA CI <{username or mail_to}>"
    msg["To"] = mail_to

    try:
        with smtplib.SMTP(mail_server, port, timeout=30) as smtp:
            smtp.starttls()
            if username:
                smtp.login(username, password)
            smtp.send_message(msg)
    except Exception as exc:  # noqa: BLE001 - email must never fail the job
        print(f"WARNING: email send failed: {exc}", file=sys.stderr)
        return 0

    print(f"Failure email sent to {mail_to}: {subject}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
