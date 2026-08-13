/**
 * apiTokenSecurity.spec.ts
 *
 * Dedicated API session security suite. Complements (does not duplicate)
 * auth-flow.spec.ts (happy-path register→login→me→logout) and
 * security-daily.spec.ts (admin endpoints reject forged tokens) by focusing
 * specifically on session handling against the OWASP API Security Top 10:
 *
 *   API1 BOLA  — one user's token must not read another user's objects
 *   API2 Broken Authentication — malformed/forged/replayed tokens rejected
 *   API3 Broken Object Property Level Auth — token never echoes secrets
 *   API5 Broken Function Level Auth — non-admin token can't reach /api/admin/*
 *
 * Session model (from chat_server.py): opaque secrets.token_urlsafe(32) stored
 * in the sessions table and delivered in an HttpOnly `ap_auth` cookie. Bearer
 * input remains supported for API clients, but register/login never expose the
 * secret in JSON or frontend-readable storage.
 *
 * Registration is rate-limited in prod, so this file shares a small pool of
 * sessions (serial mode) instead of minting a fresh user per test.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { AUTH_BASE_URL as BASE_URL, registerSession } from '../../utils/auth-api';

type Session = Awaited<ReturnType<typeof registerSession>>;

async function me(ctx: APIRequestContext, token: string) {
  return ctx.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
}

test.describe('API token security (cookie sessions)', {
  tag: ['@security', '@pure'],
}, () => {
  // Shared sessions + register backoff need more than the default 60s budget.
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  let userA: Session;
  let userB: Session;

  test.beforeAll(async ({ playwright }) => {
    // Two shared sessions cover BOLA + most positive-path checks.
    userA = await registerSession(playwright, 'tok-a');
    // Gap so the IP rate-limiter does not trip on consecutive mints.
    await new Promise((r) => setTimeout(r, 2500));
    userB = await registerSession(playwright, 'tok-b');
  });

  test.afterAll(async () => {
    await userA?.ctx.dispose().catch(() => undefined);
    await userB?.ctx.dispose().catch(() => undefined);
  });

  test('session cookies are opaque, protected, and high-entropy', async () => {
    for (const t of [userA.token, userB.token]) {
      expect(t.length, 'token must be long (≥32 chars)').toBeGreaterThanOrEqual(32);
      expect(t, 'token must be URL-safe charset').toMatch(/^[A-Za-z0-9_-]+$/);
      // Must NOT look like a JWT (header.payload.signature).
      expect(t.split('.').length, 'token must not be a 3-part JWT').not.toBe(3);
    }
    let prefix = 0;
    while (prefix < userA.token.length && userA.token[prefix] === userB.token[prefix]) prefix++;
    expect(prefix, 'two fresh tokens must not share a long prefix').toBeLessThan(8);
  });

  test('register responses never expose password, hash, or session token', async () => {
    for (const body of [userA.body, userB.body]) {
      const serialized = JSON.stringify(body).toLowerCase();
      expect(serialized, 'must not contain password').not.toContain('password');
      expect(serialized, 'must not contain a hash field').not.toMatch(/password_hash|scrypt|pbkdf2/);
      expect(body, 'register JSON must not expose the session token').not.toHaveProperty('token');
    }
  });

  test('/api/auth/me payload contains only safe public fields', async () => {
    const r = await me(userA.ctx, userA.token);
    expect(r.status()).toBe(200);
    const body = await r.json();
    const keys = Object.keys(body);
    for (const forbidden of ['password', 'password_hash', 'token', 'session']) {
      expect(keys, `/me must not expose "${forbidden}"`).not.toContain(forbidden);
    }
  });

  test("user A's token cannot read user B's identity via /api/auth/me", async () => {
    const asA = await me(userA.ctx, userA.token);
    expect(asA.status()).toBe(200);
    const aBody = await asA.json();
    expect(aBody.email).toBe(userA.user.email);
    expect(aBody.email, "A's token must never resolve to B").not.toBe(userB.user.email);

    const asB = await me(userB.ctx, userB.token);
    const bBody = await asB.json();
    expect(bBody.email).toBe(userB.user.email);
    expect(bBody.email).not.toBe(userA.user.email);
  });

  test("user A's token cannot fetch user B's private messages", async () => {
    const direct = await userA.ctx.get('/api/user/messages', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    expect([200, 401, 501]).toContain(direct.status());

    if (direct.status() === 200) {
      const override = await userA.ctx.get(
        `/api/user/messages?user_id=${encodeURIComponent(userB.body.user?.id || 'someone-else')}`,
        { headers: { Authorization: `Bearer ${userA.token}` } },
      );
      expect(override.status(), 'user_id override must not 5xx').toBeLessThan(500);
      const txt = await override.text();
      expect(txt, "must not leak B's email through user_id override").not.toContain(userB.user.email);
    }
  });

  test('a normal (non-admin) user token cannot reach admin endpoints', async () => {
    const adminEndpoints = [
      '/api/admin/conversations',
      '/api/admin/messages?user_id=anybody',
      '/api/admin/email-status',
      '/api/admin-inbox',
    ];
    for (const path of adminEndpoints) {
      const r = await userA.ctx.get(path, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      expect(
        [401, 403],
        `non-admin token on ${path} must be 401/403, got ${r.status()}`,
      ).toContain(r.status());
    }

    const reply = await userA.ctx.post('/api/admin/reply', {
      headers: { Authorization: `Bearer ${userA.token}` },
      data: { user_id: 'x', text: 'unauthorised' },
    });
    expect([401, 403, 501], 'non-admin admin/reply must be blocked').toContain(reply.status());
  });

  test('a revoked (logged-out) session cannot be replayed', async ({ playwright }) => {
    // Needs its own session so we don't invalidate the shared pool.
    await new Promise((r) => setTimeout(r, 1200));
    const { token, ctx } = await registerSession(playwright, 'tok-out');

    expect((await me(ctx, token)).status()).toBe(200);

    const out = await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(out.status()).toBeLessThan(300);

    const replay = await me(ctx, token);
    expect(replay.status(), 'replayed post-logout token must be 401').toBe(401);

    await ctx.dispose();
  });

  test('malformed Authorization headers are all rejected with 401', async ({ request }) => {
    const variants = [
      'Bearer',
      'Bearer ',
      'bearer lowercasescheme',
      'Basic dXNlcjpwYXNz',
      'Token abc123',
      'Bearer null',
      'Bearer undefined',
      'Bearer ' + 'A'.repeat(5000),
    ];
    for (const v of variants) {
      const r = await request.get(`${BASE_URL}/api/auth/me`, { headers: { Authorization: v } });
      expect([401, 403], `header "${v.slice(0, 24)}…" must be rejected, got ${r.status()}`)
        .toContain(r.status());
      expect(r.status(), `header "${v.slice(0, 24)}…" must not 5xx`).toBeLessThan(500);
    }
  });

  test('SQL-injection / special chars in the token do not crash or bypass auth', async ({ request }) => {
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
      const txt = (await r.text()).toLowerCase();
      expect(txt, 'response must not reflect the injection payload').not.toContain('drop table');
      expect(txt, 'response must not reflect script tags').not.toContain('<script>');
    }
  });

  test('no token at all → 401 on every protected endpoint', async ({ request }) => {
    for (const path of ['/api/auth/me', '/api/user/messages']) {
      const r = await request.get(`${BASE_URL}${path}`);
      expect([401, 403], `${path} with no token must be 401/403`).toContain(r.status());
    }
  });
});
