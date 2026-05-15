/**
 * ping-providers.ts
 * Quick connectivity + auth check for all configured LLM providers.
 * Usage: npx ts-node scripts/ping-providers.ts
 */

import * as https from 'https';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface PingTarget {
  name: string;
  url: string;
  headers: Record<string, string>;
  keyEnv: string;
}

const PROVIDERS: PingTarget[] = [
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/models',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ''}` },
    keyEnv: 'GROQ_API_KEY',
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/models',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}` },
    keyEnv: 'OPENROUTER_API_KEY',
  },
  {
    name: 'HuggingFace',
    url: 'https://huggingface.co/api/models?pipeline_tag=text-generation&limit=1',
    headers: { Authorization: `Bearer ${process.env.HF_TOKEN ?? ''}` },
    keyEnv: 'HF_TOKEN',
  },
  {
    name: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY ?? ''}` },
    keyEnv: 'GEMINI_API_KEY',
  },
  {
    name: 'Cerebras',
    url: 'https://api.cerebras.ai/v1/models',
    headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY ?? ''}` },
    keyEnv: 'CEREBRAS_API_KEY',
  },
  {
    name: 'SambaNova',
    url: 'https://api.sambanova.ai/v1/models',
    headers: { Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY ?? ''}` },
    keyEnv: 'SAMBANOVA_API_KEY',
  },
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/models',
    headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY ?? ''}` },
    keyEnv: 'MISTRAL_API_KEY',
  },
];

function ping(target: PingTarget): Promise<{ ok: boolean; status: number; ms: number; note: string }> {
  return new Promise((resolve) => {
    if (!process.env[target.keyEnv]) {
      return resolve({ ok: false, status: 0, ms: 0, note: 'KEY MISSING' });
    }
    const start = Date.now();
    const req = https.get(
      target.url,
      {
        headers: {
          'User-Agent': 'PW_alexpavsky-ping/1.0',
          'Content-Type': 'application/json',
          ...target.headers,
        },
      },
      (res) => {
        res.resume(); // drain
        const ms = Date.now() - start;
        const ok = (res.statusCode ?? 0) < 400;
        resolve({
          ok,
          status: res.statusCode ?? 0,
          ms,
          note: ok ? 'OK' : `HTTP ${res.statusCode}`,
        });
      },
    );
    req.setTimeout(10_000, () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: Date.now() - start, note: 'TIMEOUT' });
    });
    req.on('error', (e) => {
      resolve({ ok: false, status: 0, ms: Date.now() - start, note: `ERROR: ${e.message}` });
    });
  });
}

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';
const GRAY  = '\x1b[90m';

async function main() {
  console.log(`\n${'─'.repeat(58)}`);
  console.log('  LLM Provider Connectivity Ping');
  console.log(`${'─'.repeat(58)}\n`);

  const results = await Promise.all(PROVIDERS.map((p) => ping(p).then((r) => ({ ...r, name: p.name }))));

  let passed = 0;
  for (const r of results) {
    const icon   = r.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const status = r.ok ? `${GREEN}${r.note}${RESET}` : `${RED}${r.note}${RESET}`;
    const ms     = r.ms > 0 ? `${GRAY}(${r.ms}ms)${RESET}` : '';
    console.log(`  ${icon}  ${r.name.padEnd(14)} ${status} ${ms}`);
    if (r.ok) passed++;
  }

  console.log(`\n${'─'.repeat(58)}`);
  const total = PROVIDERS.length;
  const color = passed === total ? GREEN : passed > 0 ? '\x1b[33m' : RED;
  console.log(`  ${color}${passed}/${total} providers reachable${RESET}`);
  console.log(`${'─'.repeat(58)}\n`);

  process.exit(passed === 0 ? 1 : 0);
}

main();
