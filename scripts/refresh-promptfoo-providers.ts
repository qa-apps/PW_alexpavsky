/**
 * scripts/refresh-promptfoo-providers.ts
 *
 * Fetches the latest models from Groq, OpenRouter, and HuggingFace
 * and regenerates the `providers:` block in promptfooconfig.yaml.
 *
 * Run automatically before `npm run eval` via the `eval:refresh` script.
 * Uses the same 7-day disk cache as model-registry.ts — so it's fast on repeat runs.
 *
 * Usage:
 *   npx ts-node scripts/refresh-promptfoo-providers.ts
 *   npm run eval:refresh   ← refresh + eval in one command
 */

import * as fs from 'fs';
import * as path from 'path';
import { getModelRegistry, ModelEntry, ModelTier } from '../utils/model-registry';

const CONFIG_PATH = path.join(process.cwd(), 'promptfooconfig.yaml');
const DEFAULT_EVAL_PROVIDER = 'openai:chat:llama-3.3-70b-versatile';

// How many models to include per provider per tier
const MAX_PER_PROVIDER_TIER = 2;

// ─── YAML serialisation helpers ───────────────────────────────────────────────

function providerBlock(entry: ModelEntry, baseUrl: string, apiKeyEnv: string, extraHeaders?: Record<string, string>): string {
  const providerId = `openai:chat:${entry.id}`;
  const tierLabel = entry.tier === 'H' ? '★★★ Heavy' : entry.tier === 'M' ? '★★ Medium' : '★ Fast';
  const tags: string[] = [];
  if (entry.reasoning) tags.push('reasoning');
  if (entry.coding)    tags.push('coding');
  if (entry.vision)    tags.push('vision');
  if (entry.free)      tags.push('free');
  const tagStr = tags.length ? ` [${tags.join(', ')}]` : '';

  const headerLines = extraHeaders
    ? Object.entries(extraHeaders).map(([k, v]) => `        ${k}: ${v}`).join('\n')
    : '';

  const created = entry.created
    ? `  # created: ${new Date(entry.created * 1000).toISOString().slice(0, 10)}\n`
    : '';

  return [
    `  - id: ${providerId}`,
    `    label: '${entry.provider.toUpperCase()} · ${entry.label} · ${tierLabel}${tagStr}'`,
    created.trimEnd(),
    `    config:`,
    `      apiBaseUrl: ${baseUrl}`,
    `      apiKey: '{{env.${apiKeyEnv}}}'`,
    `      model: ${entry.id}`,
    `      temperature: 0`,
    ...(headerLines ? [`      headers:`, headerLines] : []),
  ].filter(Boolean).join('\n');
}

// ─── Provider section builders ────────────────────────────────────────────────

function buildGroqSection(models: ModelEntry[]): string {
  const groqModels = models.filter((m) => m.provider === 'groq');
  if (!groqModels.length) return '';

  const selected = pickModels(groqModels);
  const blocks = selected.map((m) =>
    providerBlock(m, 'https://api.groq.com/openai/v1', 'GROQ_API_KEY'),
  );

  return `  # ── Groq (${groqModels.length} models fetched, ${selected.length} selected — newest first) ──\n` + blocks.join('\n\n');
}

function buildOpenRouterSection(models: ModelEntry[]): string {
  const orModels = models.filter((m) => m.provider === 'openrouter');
  if (!orModels.length) return '';

  const selected = pickModels(orModels);
  const extraHeaders = {
    'HTTP-Referer': 'https://github.com/PW_alexpavsky',
    'X-Title': 'PW AlexPavsky CI',
  };
  const blocks = selected.map((m) =>
    providerBlock(m, 'https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY', extraHeaders),
  );

  return `  # ── OpenRouter (${orModels.length} free models fetched, ${selected.length} selected — newest first) ──\n` + blocks.join('\n\n');
}

function buildHuggingFaceSection(models: ModelEntry[]): string {
  const hfModels = models.filter((m) => m.provider === 'huggingface');
  if (!hfModels.length) return '';

  const selected = pickModels(hfModels);
  const blocks = selected.map((m) => {
    const baseUrl = `https://api-inference.huggingface.co/models/${m.id}/v1`;
    return providerBlock(m, baseUrl, 'HF_TOKEN');
  });

  return `  # ── HuggingFace (${hfModels.length} models fetched, ${selected.length} selected — newest first) ──\n` + blocks.join('\n\n');
}

/** Pick best N models per tier: newest H first, then M, then S */
function pickModels(models: ModelEntry[]): ModelEntry[] {
  const tiers: ModelTier[] = ['H', 'M', 'S'];
  const selected: ModelEntry[] = [];
  for (const tier of tiers) {
    const inTier = models.filter((m) => m.tier === tier).slice(0, MAX_PER_PROVIDER_TIER);
    selected.push(...inTier);
  }
  return selected;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[refresh-promptfoo-providers] Fetching models from registry...');
  const models = await getModelRegistry();

  const defaultProvider = (() => {
    const stableGroq = models.find((m) => m.provider === 'groq' && m.id === 'llama-3.3-70b-versatile');
    if (stableGroq) return `openai:chat:${stableGroq.id}`;
    const best = models.find((m) => m.provider === 'groq' && (m.tier === 'M' || m.tier === 'H'));
    if (best) return `openai:chat:${best.id}`;
    return DEFAULT_EVAL_PROVIDER;
  })();

  const groqSection     = buildGroqSection(models);
  const orSection       = buildOpenRouterSection(models);
  const hfSection       = buildHuggingFaceSection(models);

  const providersBlock = [groqSection, orSection, hfSection]
    .filter(Boolean)
    .join('\n\n');

  // Read existing config, replace only the providers: block
  const original = fs.readFileSync(CONFIG_PATH, 'utf-8');

  // Find the start of tests: block — we keep everything after it untouched
  const testsMarker = '\ntests:';
  const testsIdx = original.indexOf(testsMarker);
  if (testsIdx === -1) {
    console.error('[refresh-promptfoo-providers] Could not find "tests:" marker in config — aborting.');
    process.exit(1);
  }

  const testsAndBeyond = original.slice(testsIdx);
  const beforeProviders = original.slice(0, original.indexOf('\nproviders:'));

  const refreshedAt = new Date().toISOString().slice(0, 10);
  const newConfig = [
    beforeProviders.trim(),
    '',
    `# ── Auto-generated providers ─────────────────────────────────────────────────`,
    `# Last refreshed: ${refreshedAt}  |  Total models in registry: ${models.length}`,
    `# Refresh manually: npm run eval:refresh`,
    `# Default provider (newest M/H from Groq): ${defaultProvider}`,
    ``,
    `defaultTest:`,
    `  options:`,
    `    provider: ${defaultProvider}`,
    ``,
    `providers:`,
    providersBlock,
    testsAndBeyond.trim(),
    '',
  ].join('\n');

  fs.writeFileSync(CONFIG_PATH, newConfig, 'utf-8');

  const groqCount = models.filter((m) => m.provider === 'groq').length;
  const orCount   = models.filter((m) => m.provider === 'openrouter').length;
  const hfCount   = models.filter((m) => m.provider === 'huggingface').length;

  console.log(`[refresh-promptfoo-providers] Done!`);
  console.log(`  Groq:         ${groqCount} models`);
  console.log(`  OpenRouter:   ${orCount} models`);
  console.log(`  HuggingFace:  ${hfCount} models`);
  console.log(`  Default:      ${defaultProvider}`);
  console.log(`  Config:       ${CONFIG_PATH}`);
}

main().catch((e) => {
  console.error('[refresh-promptfoo-providers] Fatal error:', e);
  process.exit(1);
});
