/**
 * Playwright global setup — runs once before any test worker starts.
 *
 * Clears the stale `.current-report` marker so each `npx playwright test`
 * invocation produces a fresh verdict report instead of appending to a
 * leftover file from a previous run.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPORT_DIR = path.join(process.cwd(), 'test-results', 'judge-verdicts');
const MARKER_FILE = path.join(REPORT_DIR, '.current-report');

export default function globalSetup() {
  if (fs.existsSync(MARKER_FILE)) {
    fs.unlinkSync(MARKER_FILE);
    console.log('[global-setup] Cleared stale verdict-report marker');
  }
}
