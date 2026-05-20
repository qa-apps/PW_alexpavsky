#!/bin/bash
# test-triage runner — call this from CI when tests fail, or run manually.
#
# Usage:
#   ./ops/run-triage.sh                    # triage all failures
#   ./ops/run-triage.sh auth.spec.ts       # triage one specific spec
#
# CI (GitHub Actions) — add after the test step:
#   - name: Triage failures
#     if: failure()
#     run: ./ops/run-triage.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SPEC="${1:-}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$SCRIPT_DIR/logs"
echo ""
echo "═══════════════════════════════════════════"
echo "Test Triage started at $TIMESTAMP"
echo "Spec: ${SPEC:-all}"
echo "═══════════════════════════════════════════"

if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
fi

if ! command -v claude &>/dev/null; then
  echo "❌ ERROR: 'claude' CLI not found."
  exit 1
fi

cd "$PROJECT_DIR"

if [ -n "$SPEC" ]; then
  PROMPT="Triage the failing Playwright tests in spec file: $SPEC. Run only that spec, classify each failure as SITE BUG / TEST ISSUE / ENV ISSUE, fix test issues, and write a triage report to judge-verdicts/."
else
  PROMPT="Run the full Playwright test suite, triage all failures. For each failing test, classify as SITE BUG / TEST ISSUE / ENV ISSUE. Fix test issues directly. Write a triage summary to judge-verdicts/triage-$(date +%Y-%m-%d).md"
fi

claude --agent playwright-test-triage --print "$PROMPT"

echo ""
echo "Triage finished at $(date '+%Y-%m-%d %H:%M:%S')"
