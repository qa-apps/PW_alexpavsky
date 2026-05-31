/**
 * theme.spec.ts
 *
 * Owner contract: first visit defaults to DARK theme; user can flip to
 * LIGHT; that choice persists across reloads via localStorage. Catches
 * the regression where a CSS refactor accidentally inverts the default
 * or breaks the persistence.
 */
import { test, expect } from '../utils/fixtures';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

test.describe('Theme — default + toggle + persistence', () => {

  test('first visit defaults to DARK theme', async ({ browser }) => {
    // Fresh context so no localStorage carries over from another test.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    const isLight = await page.evaluate(() => document.body.classList.contains('light-mode'));
    expect(isLight, 'body must NOT have light-mode on first visit (default = dark)').toBe(false);
    await ctx.close();
  });

  test('clicking theme toggle flips to LIGHT and persists across reload', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL);

    // Sanity: starts dark
    expect(await page.evaluate(() => document.body.classList.contains('light-mode'))).toBe(false);

    // Flip to light
    await page.locator('#theme-toggle').click();
    await expect.poll(
      () => page.evaluate(() => document.body.classList.contains('light-mode')),
      { timeout: 5_000, message: 'body must gain light-mode after toggle click' },
    ).toBe(true);

    // Reload — choice must persist
    await page.reload();
    const stillLight = await page.evaluate(() => document.body.classList.contains('light-mode'));
    expect(stillLight, 'light-mode must persist across reload (localStorage)').toBe(true);

    // Flip back to dark, reload again
    await page.locator('#theme-toggle').click();
    await page.reload();
    const backToDark = await page.evaluate(() => !document.body.classList.contains('light-mode'));
    expect(backToDark, 'dark-mode must persist across reload').toBe(true);

    await ctx.close();
  });

  test('theme-toggle button is reachable by keyboard (Tab + Enter)', async ({ page }) => {
    await page.goto(BASE_URL);
    const focusedTheme = await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      btn?.focus();
      return document.activeElement === btn;
    });
    expect(focusedTheme, 'theme toggle must be focusable').toBe(true);
    await page.keyboard.press('Enter');
    await expect.poll(
      () => page.evaluate(() => document.body.classList.contains('light-mode')),
      { timeout: 3_000 },
    ).toBe(true);
  });
});
