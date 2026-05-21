/**
 * rag-admin.spec.ts
 * ---------------------------------------------------------------------------
 * Contract + happy-path tests for the RAG service (rag/main.py — FastAPI).
 *
 * Endpoints covered:
 *   POST /api/rag/query     — RAG retrieval + LLM answer
 *   POST /api/rag/upload    — ingest a document (PDF/MD/DOCX) into Qdrant
 *   POST /api/eval/run      — kick off an eval against the golden questions
 *   GET  /api/eval/results  — paginated eval history
 *   GET  /api/rag/metrics   — per-query metrics (faithfulness, relevancy)
 *
 * Read-only tests run by default. The destructive ones (upload / eval-run)
 * are gated behind RAG_DESTRUCTIVE_TESTS=1 because they:
 *   - Push real chunks into Qdrant (clutters the production collection).
 *   - Spend LLM quota by triggering a full eval.
 * Set the flag explicitly in CI when you want them.
 *
 * The query test asks a question whose answer is in the corpus
 * (FinNova case study) — same source used by tests/rag/golden_questions.json,
 * so this is a stable, semantically-grounded smoke.
 */
import { expect, test } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';
const DESTRUCTIVE = process.env.RAG_DESTRUCTIVE_TESTS === '1';

test.describe('RAG — read-only', () => {
  test('POST /api/rag/query returns answer + sources + contexts', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/rag/query`, {
      data: { query: 'What is FinNova Bank?' },
      timeout: 30_000,
    });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type'] || '').toMatch(/application\/json/i);
    const body = await r.json();

    // Contract shape — these keys are what ragas_eval.py and the frontend
    // chat widget both depend on.
    for (const key of ['answer', 'sources', 'contexts', 'metrics']) {
      expect(body, `missing key: ${key}`).toHaveProperty(key);
    }
    expect(typeof body.answer).toBe('string');
    expect(Array.isArray(body.sources)).toBe(true);
    expect(Array.isArray(body.contexts)).toBe(true);

    // Soft assertions on the answer: it must NOT be the upstream-LLM
    // outage sentinel — if it is, the chatbot is broken in prod.
    const a = body.answer.toLowerCase();
    expect(a, 'upstream LLM provider chain is down').not.toContain('llm unavailable');
    expect(a, 'upstream LLM provider chain is down').not.toContain('all providers failed');

    // For this well-known question the corpus does contain the answer —
    // we should see at least one source chunk back.
    expect(body.sources.length).toBeGreaterThan(0);
  });

  test('POST /api/rag/query with empty body returns 4xx', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/rag/query`, { data: {} });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test('POST /api/rag/query with empty string returns 4xx', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/rag/query`, { data: { query: '' } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test('GET /api/rag/metrics returns recent queries with metric fields', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/rag/metrics`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('queries');
    expect(Array.isArray(body.queries)).toBe(true);

    if (body.queries.length === 0) {
      // Empty metrics is valid (e.g. right after a DB reset). Nothing else
      // to assert.
      return;
    }
    const sample = body.queries[0];
    // Each record should have these fields (some may be null when judge
    // wasn't run on the row).
    for (const key of ['id', 'query', 'answer', 'created_at']) {
      expect(sample, `metrics row missing ${key}`).toHaveProperty(key);
    }
  });

  test('GET /api/eval/results returns paginated list', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/eval/results`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    // FastAPI paginated shape — locked from live probe.
    for (const key of ['results', 'total', 'limit', 'offset']) {
      expect(body, `missing key: ${key}`).toHaveProperty(key);
    }
    expect(Array.isArray(body.results)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('GET /api/eval/results respects limit query param', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/eval/results?limit=2`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.limit).toBe(2);
    expect(body.results.length).toBeLessThanOrEqual(2);
  });

  test('POST /api/rag/upload with no file returns 422 (FastAPI validation)', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/rag/upload`);
    // FastAPI returns 422 when a required form field is missing.
    expect([400, 422]).toContain(r.status());
    expect(r.headers()['content-type'] || '').toMatch(/application\/json/i);
  });

  test('POST /api/eval/run with no body returns 422', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/eval/run`, { data: {} });
    expect([400, 422]).toContain(r.status());
  });
});

test.describe('RAG — corpus-aware semantic checks', () => {
  // These three questions are known to be in the corpus (see
  // tests/rag/golden_questions.json). If they suddenly fail, the corpus
  // wasn't re-indexed after a deploy or Qdrant is empty.
  const GROUNDED_QUESTIONS = [
    { q: 'How many AI agents were deployed at FinNova Bank?', mustContain: ['7', 'seven'] },
    { q: 'By how much did FinNova reduce production bugs?', mustContain: ['67%', '67 %'] },
    { q: 'How many retail customers does FinNova Bank serve?', mustContain: ['2.4 million', '2.4M', '2,400,000'] },
  ];

  for (const { q, mustContain } of GROUNDED_QUESTIONS) {
    test(`grounded question: "${q.slice(0, 50)}..."`, async ({ request }) => {
      const r = await request.post(`${BASE_URL}/api/rag/query`, {
        data: { query: q },
        timeout: 30_000,
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      const answer = (body.answer || '').toLowerCase();

      // Skip soft-fail if upstream LLM is down — that's a different problem
      // surfaced by the read-only test above.
      test.skip(
        answer.includes('llm unavailable') || answer.includes('all providers failed'),
        'upstream LLM chain unavailable — not a corpus regression',
      );

      const hit = mustContain.some((needle) => answer.includes(needle.toLowerCase()));
      expect(hit, `answer should mention one of: ${mustContain.join(', ')}\n\nGot: ${body.answer.slice(0, 300)}`)
        .toBe(true);
      expect(body.sources.length, 'no source chunks returned for grounded question').toBeGreaterThan(0);
    });
  }
});

test.describe('RAG — destructive (RAG_DESTRUCTIVE_TESTS=1)', () => {
  test.skip(!DESTRUCTIVE, 'Set RAG_DESTRUCTIVE_TESTS=1 to run upload/eval-run tests');

  test('POST /api/rag/upload accepts a small text doc', async ({ request }) => {
    // Multipart form with a tiny doc — should chunk + embed + return ok.
    const tinyDoc = Buffer.from(
      `# Test doc ${Date.now()}\n\nThis is a temporary smoke document for the rag-admin suite. ` +
      `It mentions a unique phrase: "RAGADMINSMOKE-${Date.now()}".\n`,
    );
    const r = await request.post(`${BASE_URL}/api/rag/upload`, {
      multipart: {
        file: {
          name: `smoke-${Date.now()}.md`,
          mimeType: 'text/markdown',
          buffer: tinyDoc,
        },
      },
      timeout: 30_000,
    });
    expect(r.status()).toBeLessThan(300);
    const body = await r.json();
    // Backend should report how many chunks were ingested.
    expect(body).toHaveProperty('chunks_indexed');
    expect(body.chunks_indexed).toBeGreaterThan(0);
  });

  test('POST /api/eval/run kicks off an eval and returns a run id', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/eval/run`, {
      data: { suite: 'ragas', limit: 1 },
      timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(300);
    const body = await r.json();
    // Either run_id (async) or full results (sync). Lock the contract:
    // it must be a JSON object, not a 5xx HTML page.
    expect(typeof body).toBe('object');
    expect(body).not.toHaveProperty('error');
  });
});
