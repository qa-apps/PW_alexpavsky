/**
 * apiTokenSecurity.spec.ts
 *
 * Dedicated API auth-session security suite. Complements (does not duplicate)
 * auth-flow.spec.ts (happy-path register→login→me→logout) and
 * security-daily.spec.ts (admin endpoints reject forged tokens) by focusing
 * specifically on session handling against the OWASP API Security Top 10:
 *
 *   API1 BOLA  — one user's session must not read another user's objects
 *   API2 Broken Authentication — malformed/forged/replayed tokens rejected
 *   API3 Broken Object Property Level Auth — session never echoes secrets
 *   API5 Broken Function Level Auth — non-admin session can't reach /api/admin/*
 *
 * Session model: auth endpoints set an opaque HttpOnly `ap_auth` cookie.
 * /api/auth/me, /api/user/messages, and /api/admin/* authenticate from that
 * cookie. The cookie must not be guessable, exposed in JSON, or replayable
 * after logout.
 *
 * Every test mints its own ephemeral user(s) so runs are isolated and
 * idempotent. The .test TLD keeps them out of any real email index.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

test.describe.configure({ mode: 'serial' });

function ephemeralUser(tag = 'tok') {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Token User ${stamp}`,
    email: `qa-${tag}-${stamp}@alexpavsky.test`,
    password: `T0k!-${stamp}-Zx`,
  };
}

/** Register a fresh user and return {sessionCookie, user, body, ctx}. */
async function registerUser(playwright: any) {
  const ctx: APIRequestContext = await playwright.request.newContext({ baseURL: BASE_URL });
  const user = ephemeralUser();
  const reg = await ctx.post('/api/auth/register', { data: user });
  expect(reg.status(), `register failed: ${await reg.text()}`).toBeLessThan(300);
  const body = await reg.json();
  const setCookie = reg.headers()['set-cookie'] || '';
  const match = setCookie.match(/(?:^|;\s*)ap_auth=([^;]+)/);
  expect(match?.[1], 'register must set ap_auth cookie').toBeTruthy();
  expect(setCookie, 'auth cookie must be HttpOnly').toMatch(/httponly/i);
  expect(setCookie, 'auth cookie must be Secure').toMatch(/secure/i);
  return { sessionCookie: match![1], user, body, ctx };
}

async function me(ctx: APIRequestContext) {
  return ctx.get('/api/auth/me');
}

test.describe('API session security — OWASP API2 Broken Authentication @upstream', () => {

  test('session cookie is opaque and high-entropy — not a guessable/sequential value', async ({ playwright }) => {
    // Mint two sessions back to back; they must be unrelated, long, and
    // URL-safe (no JWT structure that could leak a signing secret).
    const a = await registerUser(playwright);
    const b = await registerUser(playwright);

    for (const t of [a.sessionCookie, b.sessionCookie]) {
      expect(t.length, 'session cookie must be long (≥32 chars)').toBeGreaterThanOrEqual(32);
      expect(t, 'session cookie must be URL-safe charset').toMatch(/^[A-Za-z0-9_-]+$/);
      // Must NOT look like a JWT (header.payload.signature) — those can leak
      // claims / alg-none vulnerabilities if mis-handled.
      expect(t.split('.').length, 'session cookie must not be a 3-part JWT').not.toBe(3);
    }
    // The two sessions must share no long common prefix (would imply sequential mint).
    let prefix = 0;
    while (prefix < a.sessionCookie.length && a.sessionCookie[prefix] === b.sessionCookie[prefix]) prefix++;
    expect(prefix, 'two fresh sessions must not share a long prefix').toBeLessThan(8);

    await a.ctx.dispose();
    await b.ctx.dispose();
  });

  test('malformed Authorization headers are all rejected with 401', async ({ request }) => {
    const variants = [
      'Bearer',                       // scheme only
      'Bearer ',                      // empty token
      'bearer lowercasescheme',       // wrong case scheme
      'Basic dXNlcjpwYXNz',           // wrong scheme entirely
      'Token abc123',                 // wrong scheme keyword
      'Bearer null',                  // literal null
      'Bearer undefined',             // literal undefined
      'Bearer ' + 'A'.repeat(5000),   // absurdly long token (no crash)
    ];
    for (const v of variants) {
      const r = await request.get(`${BASE_URL}/api/auth/me`, { headers: { Authorization: v } });
      expect([401, 403], `header "${v.slice(0, 24)}…" must be rejected, got ${r.status()}`)
        .toContain(r.status());
      // Never a 5xx — a malformed header must not crash the handler.
      expect(r.status(), `header "${v.slice(0, 24)}…" must not 5xx`).toBeLessThan(500);
    }
  });

  test('SQL-injection / special chars in a legacy Bearer token do not crash or bypass auth', async ({ request }) => {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE sessions;--",
      '../../etc/passwd',
      '%00admin',
      '{"$ne":null}',
      '<script>alert(1)</script>',
    ];
    for (const p of payloads) {
      const r = await request.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${p}` },
      });
      expect(r.status(), `injection "${p}" must be 401/403, got ${r.status()}`).toBeGreaterThanOrEqual(401);
      expect(r.status(), `injection "${p}" must not 5xx`).toBeLessThan(500);
      // Body must not reflect the payload back (no XSS / no error leakage).
      const txt = (await r.text()).toLowerCase();
      expect(txt, 'response must not reflect the injection payload').not.toContain('drop table');
      expect(txt, 'response must not reflect script tags').not.toContain('<script>');
    }
  });

  test('a revoked (logged-out) session cannot be replayed', async ({ playwright }) => {
    const { ctx } = await registerUser(playwright);

    // Session works pre-logout
    expect((await me(ctx)).status()).toBe(200);

    // Logout
    const out = await ctx.post('/api/auth/logout');
    expect(out.status()).toBeLessThan(300);

    // Replay the SAME cookie jar — must be dead now (no session resurrection)
    const replay = await me(ctx);
    expect(replay.status(), 'post-logout session must be 401').toBe(401);

    await ctx.dispose();
  });

  test('no session at all → 401 on every protected endpoint', async ({ request }) => {
    for (const path of ['/api/auth/me', '/api/user/messages']) {
      const r = await request.get(`${BASE_URL}${path}`);
      expect([401, 403], `${path} with no token must be 401/403`).toContain(r.status());
    }
  });
});

test.describe('API session security — OWASP API1 BOLA (cross-user isolation) @upstream', () => {

  test("user A's session cannot read user B's identity via /api/auth/me", async ({ playwright }) => {
    const a = await registerUser(playwright);
    const b = await registerUser(playwright);

    // A's session returns A — never B.
    const asA = await me(a.ctx);
    expect(asA.status()).toBe(200);
    const aBody = await asA.json();
    expect(aBody.email).toBe(a.user.email);
    expect(aBody.email, "A's session must never resolve to B").not.toBe(b.user.email);

    // B's session returns B — never A.
    const asB = await me(b.ctx);
    const bBody = await asB.json();
    expect(bBody.email).toBe(b.user.email);
    expect(bBody.email).not.toBe(a.user.email);

    await a.ctx.dispose();
    await b.ctx.dispose();
  });

  test("user A's session cannot fetch user B's private messages", async ({ playwright }) => {
    const a = await registerUser(playwright);
    const b = await registerUser(playwright);

    // /api/user/messages is scoped to the session's own user_id. A's session
    // must only ever see A's messages — there must be no user_id override
    // (query param, body) that lets A read B's thread.
    const direct = await a.ctx.get('/api/user/messages');
    // Endpoint is currently a 501 stub for POST but GET returns the caller's
    // own messages. Tolerate 200 (own scope) or 501 (not wired) — what we
    // forbid is a 200 that contains another user's data via override.
    expect([200, 401, 501]).toContain(direct.status());

    if (direct.status() === 200) {
      // Attempt the classic BOLA: override user_id to B via query string.
      const override = await a.ctx.get(`/api/user/messages?user_id=${encodeURIComponent(b.body.user?.id || 'someone-else')}`);
      // Must NOT return B's data. Either ignores the param (returns A's own,
      // empty) or rejects. The forbidden outcome is leaking another user.
      expect(override.status(), 'user_id override must not 5xx').toBeLessThan(500);
      const txt = await override.text();
      expect(txt, "must not leak B's email through user_id override").not.toContain(b.user.email);
    }

    await a.ctx.dispose();
    await b.ctx.dispose();
  });
});

test.describe('API session security — OWASP API5 Broken Function Level Auth @upstream', () => {

  test('a normal (non-admin) user session cannot reach admin endpoints', async ({ playwright }) => {
    const { ctx } = await registerUser(playwright);

    const adminEndpoints = [
      '/api/admin/conversations',
      '/api/admin/messages?user_id=anybody',
      '/api/admin/email-status',
      '/api/admin-inbox',
    ];
    for (const path of adminEndpoints) {
      const r = await ctx.get(path);
      expect(
        [401, 403],
        `non-admin session on ${path} must be 401/403, got ${r.status()}`,
      ).toContain(r.status());
    }

    // POST admin action with a non-admin session must also be blocked.
    const reply = await ctx.post('/api/admin/reply', {
      data: { user_id: 'x', text: 'unauthorised' },
    });
    expect([401, 403, 501], 'non-admin admin/reply must be blocked').toContain(reply.status());

    await ctx.dispose();
  });
});

test.describe('API session security — API3 session never leaks secrets @upstream', () => {

  test('register responses never expose password, hash, or session cookie value', async ({ playwright }) => {
    const { body, ctx } = await registerUser(playwright);
    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized, 'must not contain password').not.toContain('password');
    expect(serialized, 'must not contain a hash field').not.toMatch(/password_hash|scrypt|pbkdf2/);
    expect(serialized, 'must not expose session cookie value in JSON').not.toContain('ap_auth');
    await ctx.dispose();
  });

  test('/api/auth/me payload contains only safe public fields', async ({ playwright }) => {
    const { ctx } = await registerUser(playwright);
    const r = await me(ctx);
    const body = await r.json();
    // Allowed public shape: id, name, email, is_admin. No secrets.
    const keys = Object.keys(body);
    for (const forbidden of ['password', 'password_hash', 'token', 'session']) {
      expect(keys, `/me must not expose "${forbidden}"`).not.toContain(forbidden);
    }
    await ctx.dispose();
  });
});
