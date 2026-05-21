/**
 * api-smoke.spec.ts
 * ---------------------------------------------------------------------------
 * Contract checks for every public API surface (chat_server.py + rag/main.py).
 * Goal: catch handler crashes, status-code drift, and HTML-leaks after deploys.
 *
 * Each endpoint has an entry in CONTRACTS describing the *current production
 * contract*: HTTP method, request body if needed, the exact status it should
 * return for that probe, and a flag telling us whether the body must be JSON.
 *
 * When you wire up a new handler, update the entry — the test will then
 * enforce the new contract automatically. The lookup-table approach is
 * deliberate: it's the only way for a test file to stay in sync with a
 * code base that has 32+ endpoints, half of them stubs.
 *
 * Auth-specific endpoints live in auth-flow.spec.ts (not here) — they need
 * the full register → login → me round-trip rather than a status-code probe.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

type Probe = {
  method: 'GET' | 'POST';
  body?: unknown;
  query?: string;
  // The status we currently expect from production. Update when behaviour
  // changes intentionally; the test will tell you if you forgot.
  status: number | number[];
  // True = response body must be JSON. nginx returns text/html for unknown
  // /api/ paths today (SPA fallback) — for those we set json:false.
  json: boolean;
  // Optional structural assertion run against the parsed JSON body.
  assertBody?: (body: any) => void;
  note?: string;
};

const CONTRACTS: Record<string, Probe> = {
  // ─── Health & feed (live, JSON) ───────────────────────────────────────────
  '/api/health': {
    method: 'GET',
    status: 200,
    json: true,
    assertBody: (b) => {
      expect(b.status).toBe('ok');
      expect(b).toHaveProperty('providers');
      expect(typeof b.providers).toBe('object');
    },
  },
  '/api/feed': {
    method: 'GET',
    status: 200,
    json: true,
    assertBody: (b) => {
      const arr = Array.isArray(b) ? b : (b.articles || b.items || b.feed);
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
    },
  },

  // ─── Implemented & live ───────────────────────────────────────────────────
  '/api/chat': {
    method: 'POST',
    body: {},
    status: [400, 401, 422],
    json: true,
    note: 'Empty body — handler should reject before hitting LLM.',
  },
  '/api/challenge': {
    method: 'POST',
    body: {},
    status: [400, 401, 422],
    json: true,
  },
  '/api/attack-generator': {
    method: 'POST',
    body: {},
    // Calls an upstream LLM. Under concurrent CI load we occasionally see
    // 429 (own rate-limiter) or 503 (upstream provider unavailable) — both
    // are legitimate, not regressions. The handler itself is healthy as
    // long as we don't get 5xx-other or HTML.
    status: [200, 429, 503],
    json: true,
    note: 'Implemented; LLM-backed, tolerates rate-limit responses.',
  },
  '/api/hallucination': {
    method: 'POST',
    body: {},
    status: [200, 400, 422],
    json: true,
  },
  '/api/maintenance-login': {
    method: 'POST',
    body: { key: 'definitely-not-the-key' },
    status: [401, 403],
    json: true,
  },
  '/api/maintenance-ui': {
    method: 'GET',
    status: [200, 401, 403],
    json: false,
    note: 'Returns HTML when authed, JSON 401/403 otherwise; tolerate both.',
  },

  // ─── Authenticated-only GET ───────────────────────────────────────────────
  '/api/admin-inbox': {
    method: 'GET',
    status: [401, 403],
    // Returns text/html "403 Forbidden" page today (inconsistent with the
    // /api/admin/* siblings which use JSON). Documenting current behaviour;
    // worth normalising to JSON when this endpoint gets refactored.
    json: false,
  },
  '/api/admin/conversations': {
    method: 'GET',
    status: [401, 403],
    json: true,
  },
  '/api/admin/email-status': {
    method: 'GET',
    status: [401, 403],
    json: true,
  },
  '/api/admin/messages': {
    method: 'GET',
    status: [401, 403],
    json: true,
  },

  // ─── 501 stubs (handlers exist but return not_implemented) ────────────────
  // Locking these down so an unfinished refactor can't silently flip them to
  // 200 with broken behaviour. Auth endpoints owned by auth-flow.spec.ts.
  '/api/subscribe': {
    method: 'POST',
    body: {},
    status: 501,
    json: true,
    note: 'Stub. Replace with happy-path test when DB write is wired up.',
  },
  '/api/forum/posts': {
    method: 'POST',
    body: { title: 't', body: 'b' },
    status: 501,
    json: true,
  },
  '/api/user/messages': {
    method: 'POST',
    body: { message: 'm' },
    status: 501,
    json: true,
  },
  '/api/admin/reply': {
    method: 'POST',
    body: { conversation_id: 'x', message: 'm' },
    status: 501,
    json: true,
  },
  '/api/newsletter/run-now': {
    method: 'POST',
    status: 501,
    json: true,
  },

  // ─── nginx-level 404s (SPA fallback returns HTML) ─────────────────────────
  // /api/agent-reports is POST-only in chat_server; a GET hits the SPA
  // fallback. We document that here so it doesn't look like a regression.
  '/api/agent-reports': {
    method: 'GET',
    status: 404,
    json: false,
    note: 'POST-only endpoint. GET falls through to nginx SPA index.',
  },
};

async function runProbe(request: APIRequestContext, path: string, probe: Probe) {
  const url = `${BASE_URL}${path}${probe.query ?? ''}`;
  const r = probe.method === 'GET'
    ? await request.get(url)
    : await request.post(url, { data: probe.body ?? {} });

  const allowed = Array.isArray(probe.status) ? probe.status : [probe.status];
  expect(allowed, `unexpected status for ${probe.method} ${path}`).toContain(r.status());

  if (probe.json) {
    const ct = r.headers()['content-type'] || '';
    expect(ct, `expected JSON content-type for ${path}, got: ${ct}`).toMatch(/application\/json/i);
    const body = await r.json(); // throws on non-JSON, surfacing a clear failure
    probe.assertBody?.(body);
  }
  return r;
}

test.describe('API smoke — chat_server contracts', () => {
  for (const [path, probe] of Object.entries(CONTRACTS)) {
    test(`${probe.method} ${path} → ${probe.status}${probe.note ? ` (${probe.note})` : ''}`,
      async ({ request }) => {
        await runProbe(request, path, probe);
      },
    );
  }
});

test.describe('API smoke — unknown routes', () => {
  test('unknown /api/* path returns 404', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/route-${Date.now()}-nope`);
    expect(r.status()).toBe(404);
    // nginx SPA fallback returns text/html — that's documented behaviour.
    // We don't enforce JSON here; we just want to confirm 404 (not 200 SPA).
  });
});

test.describe('API smoke — RAG service contracts', () => {
  test('GET /api/rag/metrics → 200 JSON with queries[]', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/rag/metrics`);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type'] || '').toMatch(/application\/json/i);
    const body = await r.json();
    expect(body).toHaveProperty('queries');
    expect(Array.isArray(body.queries)).toBe(true);
  });

  test('GET /api/eval/results → 200 paginated JSON', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/eval/results`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    for (const key of ['results', 'total', 'limit', 'offset']) {
      expect(body, `missing key: ${key}`).toHaveProperty(key);
    }
  });

  test('POST /api/rag/query empty body → 4xx', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/api/rag/query`, { data: {} });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });
});
