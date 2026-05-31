/**
 * auth-flow.spec.ts
 *
 * API-level contract tests for /api/auth/* after the real implementation
 * shipped (replaces the previous "returns 501 not_implemented" stub
 * contract). The backend now returns {user, token} on register/login and
 * expects `Authorization: Bearer <token>` on /api/auth/me — NOT a
 * session cookie. The frontend stores the token in localStorage.
 *
 * Two top-level groups:
 *   1. /api/auth/me session-check edge cases (live, always runs)
 *   2. Full lifecycle register → login → me → logout (live, always runs
 *      now that the backend is wired)
 *
 * Each lifecycle test uses an ephemeral random user with a timestamped
 * email so concurrent CI workers don't collide. The .test TLD keeps
 * these out of any legitimate email index.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

function ephemeralUser() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Smoke User ${stamp}`,
    email: `qa-smoke-${stamp}@alexpavsky.test`,
    password: `P!sw-${stamp}-X9z`,
  };
}

async function postJson(request: APIRequestContext, path: string, body: unknown) {
  return request.post(`${BASE_URL}${path}`, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('Auth — /api/auth/me session check', () => {
  test('unauthenticated request returns 401 JSON', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/auth/me`);
    expect(r.status()).toBe(401);
    expect(r.headers()['content-type'] || '').toMatch(/application\/json/i);
    const data = await r.json();
    expect(data).toHaveProperty('error');
  });

  test('garbage Bearer token returns 401, not 500', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer this-is-not-a-real-token' },
    });
    expect(r.status()).toBe(401);
  });
});

test.describe('Auth — full lifecycle (live backend)', () => {
  test('register → /me → logout → /me round-trip', async ({ playwright }) => {
    const user = ephemeralUser();
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });

    // 1. Register
    const reg = await ctx.post('/api/auth/register', { data: user });
    expect(reg.status(), `register failed: ${await reg.text()}`).toBeLessThan(300);
    const regBody = await reg.json();
    expect(regBody.user, 'register must return user object').toBeTruthy();
    expect(regBody.user.email).toBe(user.email);
    expect(regBody.user.name).toBe(user.name);
    expect(regBody.user, 'must not echo back password fields').not.toHaveProperty('password');
    expect(regBody.user).not.toHaveProperty('password_hash');
    expect(typeof regBody.token, 'register must return an opaque token').toBe('string');
    expect(regBody.token.length).toBeGreaterThan(16);
    const token = regBody.token;

    // 2. /me with Bearer token must succeed and echo the user
    const me = await ctx.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.email).toBe(user.email);
    expect(meBody.name).toBe(user.name);

    // 3. Logout invalidates the session
    const out = await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(out.status()).toBeLessThan(300);

    // 4. /me after logout must be 401 again
    const afterOut = await ctx.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(afterOut.status()).toBe(401);

    await ctx.dispose();
  });

  test('login with correct credentials returns token; wrong password returns 401', async ({ playwright }) => {
    const user = ephemeralUser();
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });

    // Seed account
    const reg = await ctx.post('/api/auth/register', { data: user });
    expect(reg.status()).toBeLessThan(300);

    // Correct login
    const ok = await ctx.post('/api/auth/login', {
      data: { email: user.email, password: user.password },
    });
    expect(ok.status()).toBe(200);
    const okBody = await ok.json();
    expect(okBody.user.email).toBe(user.email);
    expect(typeof okBody.token).toBe('string');

    // Wrong password — 401, never 500, never leak which side failed
    const bad = await ctx.post('/api/auth/login', {
      data: { email: user.email, password: 'definitely-wrong' },
    });
    expect(bad.status()).toBe(401);
    const badText = (await bad.text()).toLowerCase();
    expect(badText, 'error message must not leak that the email exists')
      .not.toMatch(/email.*not.*found|user.*does not exist|no such user/);

    await ctx.dispose();
  });

  test('register with duplicate email is rejected (4xx)', async ({ playwright }) => {
    const user = ephemeralUser();
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });

    const first = await ctx.post('/api/auth/register', { data: user });
    expect(first.status()).toBeLessThan(300);

    const dup = await ctx.post('/api/auth/register', { data: user });
    expect(dup.status()).toBeGreaterThanOrEqual(400);
    expect(dup.status()).toBeLessThan(500);
    const dupBody = await dup.json();
    expect(dupBody.error).toBeTruthy();

    await ctx.dispose();
  });

  test('register rejects invalid input (empty name, bad email, short password)', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
    const cases = [
      { case: 'empty name', body: { name: '', email: 'a@b.co', password: 'longenough' } },
      { case: 'bad email', body: { name: 'X', email: 'not-an-email', password: 'longenough' } },
      { case: 'short password', body: { name: 'X', email: 'x@y.co', password: '123' } },
    ];
    for (const c of cases) {
      const r = await ctx.post('/api/auth/register', { data: c.body });
      expect(r.status(), `${c.case} should 4xx`).toBeGreaterThanOrEqual(400);
      expect(r.status(), `${c.case} should be 4xx, not 5xx`).toBeLessThan(500);
    }
    await ctx.dispose();
  });

});
