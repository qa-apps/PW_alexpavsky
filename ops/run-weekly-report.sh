#!/bin/bash
# weekly-report auto-runner
# Runs every Sunday at 9:00 AM via cron.
#
# Crontab entry (run: crontab -e):
#   0 9 * * 0 /Users/alexp/Projects/PW_alexpavsky/ops/run-weekly-report.sh >> /Users/alexp/Projects/PW_alexpavsky/ops/logs/weekly-report.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$LOG_DIR"
echo ""
echo "═══════════════════════════════════════════"
echo "Weekly QA Report started at $TIMESTAMP"
echo "═══════════════════════════════════════════"

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
fi

if ! command -v claude &>/dev/null; then
  echo "❌ ERROR: 'claude' CLI not found."
  exit 1
fi

cd "$PROJECT_DIR"
claude --agent playwright-weekly-report --print \
  "Generate the weekly QA report for alexpavsky.com covering the past 7 days. Read judge-verdicts/, playwright-report/, and test-results/. Send the summary to Slack and save the full report to judge-verdicts/weekly-report-$(date +%Y-%m-%d).md"

echo ""
echo "Weekly report finished at $(date '+%Y-%m-%d %H:%M:%S')"
