import * as fs from 'fs';
import * as path from 'path';
import type { JudgeConfig, JudgeVerdict } from './llm-judges';

const REPORT_DIR = path.join(process.cwd(), 'test-results', 'judge-verdicts');
const MARKER_FILE = path.join(REPORT_DIR, '.current-report');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getReportPath(): string {
  ensureDir(REPORT_DIR);
  if (fs.existsSync(MARKER_FILE)) {
    return fs.readFileSync(MARKER_FILE, 'utf-8').trim();
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const p = path.join(REPORT_DIR, `verdict-report-${ts}.md`);
  fs.writeFileSync(MARKER_FILE, p);
  fs.writeFileSync(p, `# LLM Judge Verdict Report\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n**Scoring Scale:** 1-5\n\n---\n\n`);
  return p;
}

export function writeVerdictReport(
  judgeName: string,
  cfg: JudgeConfig,
  prompt: string,
  response: string,
  verdict: JudgeVerdict,
  testTitle: string
): void {
  const reportPath = getReportPath();
  const section = `
## ${testTitle}

**Judge:** ${cfg.name} (${judgeName})  
**Score:** ${verdict.score}/5  
**Result:** ${verdict.passed ? 'PASS' : 'FAIL'}

**Criteria:** ${cfg.criteria.join('; ')}

### Prompt
\`\`\`
${prompt}
\`\`\`

### Response
\`\`\`
${response.slice(0, 2000)}${response.length > 2000 ? '... (truncated)' : ''}
\`\`\`

### Reasoning
${verdict.reasoning}

---

`;
  fs.appendFileSync(reportPath, section);
}
