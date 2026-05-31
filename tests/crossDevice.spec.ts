/**
 * crossDevice.spec.ts
 *
 * Runs on EVERY device project (iPhone 13, Pixel 7, iPad Pro 11,
 * Galaxy Tab S4) plus default Chromium. Asserts the critical user
 * journeys still render and function — no horizontal scroll, primary
 * CTAs visible, nav reachable, hero readable. Catches device-specific
 * layout regressions that pass on a single viewport but break on tablet
 * or phone widths.
 *
 * Per the owner contract (memory/audit_lessons.md §0.5): every UI
 * feature must work on iPhone, iPad, Android, Samsung Galaxy tablet.
 * This spec is the daily proof.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

test.describe('Cross-device — critical journeys render on every device', () => {

  test('hero headline and primary CTAs are visible without horizontal scroll', async ({ page }) => {
    await page.goto(BASE_URL);

    // Hero headline visible and within viewport horizontally.
    const headline = page.locator('.hero-title');
    await expect(headline).toBeVisible({ timeout: 10_000 });
    const box = await headline.boundingBox();
    expect(box, 'headline must have a bounding box').not.toBeNull();
    expect(box!.x, 'headline must not start off-screen left').toBeGreaterThanOrEqual(-8);
    const viewport = page.viewportSize();
    if (viewport) {
      expect(box!.x + box!.width, 'headline must not overflow right edge')
        .toBeLessThanOrEqual(viewport.width + 8);
      // Real horizontal-scroll check. We don't rely on scrollWidth —
      // headless engines report inflated scrollWidth even when nothing
      // user-visible overflows (clipped marquees, sub-pixel padding).
      // Instead: try to scroll the page right and see if scrollLeft
      // actually moves. If it stays 0, the user can't scroll → no
      // user-visible horizontal scroll bug, regardless of scrollWidth.
      const canScrollRight = await page.evaluate(() => {
        window.scrollTo(500, 0);
        const sl = window.scrollX || document.documentElement.scrollLeft;
        return sl;
      });
      expect(canScrollRight, `page must not scroll horizontally (scrolled to ${canScrollRight}px)`)
        .toBeLessThanOrEqual(16);
    }

    // At least one of the primary hero CTAs must be visible and within viewport.
    const liveFeedCta = page.locator('a, button').filter({ hasText: /Live Feed/i }).first();
    const aiLabCta = page.locator('a, button').filter({ hasText: /AI Lab/i }).first();
    const liveOK = await liveFeedCta.isVisible().catch(() => false);
    const labOK = await aiLabCta.isVisible().catch(() => false);
    expect(liveOK || labOK, 'at least one of "Live Feed" / "AI Lab" CTAs must be visible').toBe(true);
  });

  test('nav is reachable — either inline links or hamburger menu', async ({ page }) => {
    await page.goto(BASE_URL);
    const inlineLinks = await page.locator('nav .nav-link:visible').count();
    const hamburgerVisible = await page.locator('#nav-menu-btn').isVisible().catch(() => false);
    expect(
      inlineLinks > 0 || hamburgerVisible,
      'nav must offer either inline links or a hamburger button',
    ).toBe(true);
  });

  test('Live Feed renders at least one card', async ({ page }) => {
    await page.goto(BASE_URL);
    const card = page.locator('.feed-card').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
  });

  test('Login button is tappable (≥40×40 — close to WCAG 2.5.5 44pt target)', async ({ page }) => {
    await page.goto(BASE_URL);
    // On mobile the hamburger may collapse the auth into a menu; check
    // either the direct auth-btn or the mobile-menu trigger.
    const auth = page.locator('#auth-btn');
    const ham = page.locator('#nav-menu-btn');
    const target = (await auth.isVisible().catch(() => false)) ? auth : ham;
    await expect(target, 'login or menu must be visible').toBeVisible();
    const box = await target.boundingBox();
    expect(box, 'must have bounding box').not.toBeNull();
    expect(box!.width, 'tap target width ≥ 40px').toBeGreaterThanOrEqual(40);
    expect(box!.height, 'tap target height ≥ 40px').toBeGreaterThanOrEqual(40);
  });

  test('first visit defaults to DARK theme (no light-mode class)', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    const isLight = await page.evaluate(() => document.body.classList.contains('light-mode'));
    expect(isLight, 'default theme must be dark on every device').toBe(false);
    await ctx.close();
  });
});
