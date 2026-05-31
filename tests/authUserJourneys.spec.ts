/**
 * authUserJourneys.spec.ts
 *
 * UI-level happy-path tests for the two scenarios called out explicitly:
 *
 *   1. Daily existing-user login. A persisted test user (env-configurable,
 *      defaults to a deterministic qa-daily address) logs in via the auth
 *      modal. The nav "Login" button must disappear and the user's first
 *      name must show up where it used to be. If the daily user doesn't
 *      exist yet, register it once so the test is self-bootstrapping.
 *
 *   2. Fresh registration on every run. A brand-new user is generated with
 *      random name + random email + random password each invocation. The
 *      Register form is filled and submitted. Same nav state assertion:
 *      "Login" gone, user's first name visible.
 *
 * Both tests interact entirely through the UI (no direct API calls for
 * the auth step itself) — that's the whole point: catch regressions where
 * the API works but the form / nav wiring breaks.
 */

import { test, expect } from '../utils/fixtures';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

const DAILY_USER = {
  name: process.env.QA_DAILY_USER_NAME || 'QA Daily',
  email: process.env.QA_DAILY_USER_EMAIL || 'qa-daily@alexpavsky.test',
  password: process.env.QA_DAILY_USER_PASSWORD || 'DailyTestPassword!2026',
};

function randomUser() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const firstNames = ['Arthur', 'Mila', 'Sven', 'Priya', 'Ines', 'Marcus', 'Yuki', 'Hana'];
  const lastNames = ['Gilbo', 'Reyes', 'Nakamura', 'Schultz', 'Okafor', 'Lindberg', 'Patel', 'Volkov'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return {
    name: `${first} ${last}`,
    email: `qa-fresh-${stamp}@alexpavsky.test`,
    password: `Fr3sh!-${stamp}`,
    firstName: first,
  };
}

/** Ensure the daily user exists. Best-effort: register; ignore 409 (already exists). */
async function ensureDailyUserExists(page: Page) {
  const r = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: DAILY_USER,
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  });
  if (r.status() !== 201 && r.status() !== 409) {
    console.warn(`[authUserJourneys] daily-user bootstrap returned ${r.status()}: ${(await r.text()).slice(0, 200)}`);
  }
}

/** Hide the chat-teaser bubble that overlaps the Login button area. */
async function hideChatWidgetOverlays(page: Page) {
  await page.evaluate(() => {
    ['chat-teaser'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  });
}

async function openAuthModal(page: Page, tab: 'login' | 'register') {
  await page.locator('#auth-btn').click();
  await page.locator('#auth-overlay.open').waitFor({ state: 'visible', timeout: 5_000 });
  if (tab === 'register') {
    await page.locator('.auth-tab[data-tab="register"]').click();
    await page.locator('#register-form').waitFor({ state: 'visible' });
  } else {
    await page.locator('#login-form').waitFor({ state: 'visible' });
  }
}

/** After auth success the user-menu replaces the Login button. */
async function assertNavShowsUser(page: Page, firstName: string) {
  // Login button must be gone (display:none set by setLoggedIn).
  await expect(page.locator('#auth-btn'), 'Login button should be hidden after auth').toBeHidden({ timeout: 10_000 });
  // User menu must be visible with the first name.
  const display = page.locator('#user-display-name');
  await expect(display, 'user-display-name must be visible').toBeVisible();
  await expect(display).toHaveText(firstName);
}

test.describe('Auth user journeys (UI) @upstream', () => {

  test('daily test user can log in via the modal and nav swaps Login → user name', async ({ page }) => {
    await ensureDailyUserExists(page);

    await page.goto(BASE_URL);
    await hideChatWidgetOverlays(page);

    // Sanity: Login button is there before we start.
    await expect(page.locator('#auth-btn')).toBeVisible();

    await openAuthModal(page, 'login');
    await page.locator('#login-email').fill(DAILY_USER.email);
    await page.locator('#login-password').fill(DAILY_USER.password);
    await page.locator('#login-form .auth-submit').click();

    // Modal closes, nav updates.
    await expect(page.locator('#auth-overlay.open')).toBeHidden({ timeout: 10_000 });
    await assertNavShowsUser(page, DAILY_USER.name.split(' ')[0]);

    // Verify the token actually authenticates by hitting /api/auth/me from
    // within the page's storage — proves the frontend really stored it
    // and the backend really minted a valid one.
    const tokenIsValid = await page.evaluate(async () => {
      const t = localStorage.getItem('auth_token');
      if (!t) return false;
      const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } });
      return r.status === 200;
    });
    expect(tokenIsValid, 'stored auth_token must validate against /api/auth/me').toBe(true);
  });

  test('a brand-new random user can register and nav swaps Login → first name', async ({ page }) => {
    const user = randomUser();

    await page.goto(BASE_URL);
    await hideChatWidgetOverlays(page);

    await openAuthModal(page, 'register');

    await page.locator('#reg-name').fill(user.name);
    await page.locator('#reg-email').fill(user.email);
    await page.locator('#reg-password').fill(user.password);
    await page.locator('#reg-password2').fill(user.password);
    await page.locator('#register-form .auth-submit').click();

    // Modal closes on success.
    await expect(page.locator('#auth-overlay.open')).toBeHidden({ timeout: 10_000 });

    // Error inline must be empty — if backend rejected, surface the text.
    const errText = await page.locator('#register-error').innerText().catch(() => '');
    expect(errText.trim(), `register-error must be empty on success but said: "${errText}"`).toBe('');

    await assertNavShowsUser(page, user.firstName);
  });
});
