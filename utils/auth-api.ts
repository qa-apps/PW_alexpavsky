/**
 * Shared helpers for live /api/auth/* probes.
 *
 * Production rate-limits register/login bursts (HTTP 429). Suites must
 * back off briefly without exceeding Playwright's default 60s timeout.
 */
import { expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

export const AUTH_BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

export type EphemeralUser = {
  name: string;
  email: string;
  password: string;
};

export function ephemeralUser(tag = 'user'): EphemeralUser {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `QA User ${stamp}`,
    email: `qa-${tag}-${stamp}@alexpavsky.test`,
    password: `P!sw-${stamp}-X9z`,
  };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * POST /api/auth/register with short backoff on 429.
 * Keeps total wait well under a 60s test timeout (≤ ~12s of sleeps).
 */
export async function postRegister(
  ctx: APIRequestContext,
  user: EphemeralUser,
  maxAttempts = 4,
) {
  let lastStatus = 0;
  let lastText = '';
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Fresh email on retries so a half-applied first attempt cannot collide.
    const payload =
      attempt === 0 ? user : ephemeralUser(`${user.email.split('@')[0]}-r${attempt}`);
    if (attempt > 0) {
      user.name = payload.name;
      user.email = payload.email;
      user.password = payload.password;
    }
    const res = await ctx.post('/api/auth/register', { data: payload });
    lastStatus = res.status();
    if (lastStatus !== 429) return res;
    lastText = await res.text();
    // Fixed 3s gaps: 3 attempts × 3s ≈ 9s, plus request time.
    await sleep(3000);
  }
  throw new Error(
    `register still rate-limited after ${maxAttempts} attempts (last: ${lastStatus} ${lastText})`,
  );
}

/** Register and return cookie-backed session context + opaque token value. */
export async function registerSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  tag = 'tok',
) {
  const ctx: APIRequestContext = await playwright.request.newContext({
    baseURL: AUTH_BASE_URL,
  });
  const user = ephemeralUser(tag);
  const reg = await postRegister(ctx, user);
  expect(reg.status(), `register failed: ${await reg.text()}`).toBeLessThan(300);
  const body = await reg.json();
  expect(body, 'register response must not expose token').not.toHaveProperty('token');

  const state = await ctx.storageState();
  const cookie = state.cookies.find((c) => c.name === 'ap_auth');
  expect(cookie, 'register must establish ap_auth cookie').toBeTruthy();
  expect(cookie?.httpOnly, 'ap_auth must be HttpOnly').toBe(true);
  expect(cookie?.secure, 'HTTPS ap_auth must be Secure').toBe(
    AUTH_BASE_URL.startsWith('https://'),
  );
  expect(String(cookie?.sameSite || ''), 'ap_auth must use SameSite=Lax').toMatch(/^lax$/i);

  return { token: cookie!.value, user, body, ctx };
}
