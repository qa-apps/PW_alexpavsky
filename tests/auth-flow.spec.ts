/**
 * auth-flow.spec.ts
 * ---------------------------------------------------------------------------
 * Contract + happy-path tests for the auth flow.
 *
 * Current production state (probed 2026-05-21): the auth handlers in
 * chat_server.py — register / login / logout / forgot / reset — return
 *   { "error": "not_implemented" }
 * They're scaffolded but not yet wired to the users table. /api/auth/me
 * already returns 401 JSON on unauthenticated calls (session check works).
 *
 * Strategy:
 *   - Lock down the CURRENT contract (so a deploy never silently turns
 *     "not_implemented" into 200 with garbage, or into 500).
 *   - When the endpoints are implemented, flip the AUTH_LIVE flag below.
 *     The HAPPY PATH block then runs the full register → login → me →
 *     logout cycle with an ephemeral random user.
 *
 * The ephemeral user uses a timestamped email so concurrent CI runs don't
 * collide. Cleanup is best-effort: there's no admin "delete user" endpoint
 * today; the row is left in the DB. That's acceptable for a staging users
 * table — if it bites in prod, add /api/admin/user-delete and call it here.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

// Flip to true (or set AUTH_LIVE=1) once register/login/logout are wired up.
const AUTH_LIVE = process.env.AUTH_LIVE === '1';

function ephemeralUser() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Smoke User ${stamp}`,
    email: `qa-smoke-${stamp}@alexpavsky.test`,
    // Strong-enough password; backend should hash before storing.
    password: `P!sw-${stamp}-X9z`,
  };
}

async function postJson(
  request: APIRequestContext,
  path: string,
  body: unknown,
) {
  return request.post(`${BASE_URL}${path}`, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('Auth — current contract (not yet implemented)', () => {
  test.skip(AUTH_LIVE, 'AUTH_LIVE=1 — skipping not_implemented contract');

  for (const [path, body] of [
    ['/api/auth/register', { name: 'x', email: 'x@y.z', password: 'pw' }],
    ['/api/auth/login',    { email: 'x@y.z', password: 'pw' }],
    ['/api/auth/logout',   {}],
    ['/api/auth/forgot',   { email: 'x@y.z' }],
    ['/api/auth/reset',    { token: 'fake', password: 'newpw' }],
  ] as const) {
    test(`POST ${path} returns 501 not_implemented JSON`, async ({ request }) => {
      const r = await postJson(request, path, body);
      // HTTP 501 Not Implemented is the correct code for a scaffolded stub.
      // We lock both the status and the body shape — silently flipping to
      // 200 + garbage during a half-finished implementation should fail here.
      expect(r.status()).toBe(501);
      const ct = r.headers()['content-type'] || '';
      expect(ct).toMatch(/application\/json/i);
      const data = await r.json();
      expect(data).toEqual({ error: 'not_implemented' });
    });
  }
});

test.describe('Auth — /api/auth/me session check (live)', () => {
  test('unauthenticated request returns 401 JSON', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/auth/me`);
    expect(r.status()).toBe(401);
    expect(r.headers()['content-type'] || '').toMatch(/application\/json/i);
    const data = await r.json();
    expect(data).toHaveProperty('error');
  });

  test('garbage session cookie still returns 401, not 500', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: 'ap_chat_sid=this-is-not-a-real-session-id' },
    });
    expect(r.status()).toBe(401);
  });
});

test.describe('Auth — full lifecycle (live)', () => {
  // Only runs once you flip AUTH_LIVE=1. Tests below assume backend is wired
  // and persists users in `users` table with bcrypt-hashed passwords.
  test.skip(!AUTH_LIVE, 'Set AUTH_LIVE=1 once register/login/logout ship');

  test('register → login → me → logout round-trip', async ({ playwright }) => {
    const user = ephemeralUser();
    // Fresh request context so cookies are isolated from other workers.
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });

    // 1. Register
    const reg = await ctx.post('/api/auth/register', { data: user });
    expect(reg.status(), `register failed: ${await reg.text()}`).toBeLessThan(300);
    const regBody = await reg.json();
    // Either returns the new user, or just { ok: true }. Tolerate both.
    if (regBody.user) {
      expect(regBody.user.email).toBe(user.email);
      expect(regBody.user).not.toHaveProperty('password');
      expect(regBody.user).not.toHaveProperty('password_hash');
    }

    // 2. Login (sets ap_chat_sid cookie)
    const login = await ctx.post('/api/auth/login', {
      data: { email: user.email, password: user.password },
    });
    expect(login.status(), `login failed: ${await login.text()}`).toBeLessThan(300);
    const setCookie = login.headers()['set-cookie'] || '';
    expect(setCookie, 'login should set ap_chat_sid').toMatch(/ap_chat_sid=/);
    expect(setCookie, 'session cookie must be HttpOnly').toMatch(/HttpOnly/i);

    // 3. /me with session
    const me = await ctx.get('/api/auth/me');
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.email || meBody.user?.email).toBe(user.email);

    // 4. Logout
    const out = await ctx.post('/api/auth/logout');
    expect(out.status()).toBeLessThan(300);

    // 5. /me after logout must be 401 again
    const afterOut = await ctx.get('/api/auth/me');
    expect(afterOut.status()).toBe(401);

    await ctx.dispose();
  });

  test('register with duplicate email is rejected', async ({ playwright }) => {
    const user = ephemeralUser();
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
    const first = await ctx.post('/api/auth/register', { data: user });
    expect(first.status()).toBeLessThan(300);
    const dup = await ctx.post('/api/auth/register', { data: user });
    expect(dup.status()).toBeGreaterThanOrEqual(400);
    expect(dup.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('login with wrong password returns 401, never 500', async ({ playwright }) => {
    const user = ephemeralUser();
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
    await ctx.post('/api/auth/register', { data: user });
    const bad = await ctx.post('/api/auth/login', {
      data: { email: user.email, password: 'definitely-wrong' },
    });
    expect(bad.status()).toBe(401);
    await ctx.dispose();
  });

  test('forgot password for unknown email returns 200 (no enumeration)', async ({ request }) => {
    // Standard anti-enumeration pattern: return same 200 regardless of whether
    // the email exists. We just assert it doesn't 500 and doesn't reveal info.
    const r = await postJson(request, '/api/auth/forgot', {
      email: `nobody-${Date.now()}@alexpavsky.test`,
    });
    expect(r.status()).toBeLessThan(500);
    const text = (await r.text()).toLowerCase();
    expect(text).not.toContain('not found');
    expect(text).not.toContain('does not exist');
  });
});
