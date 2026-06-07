import { test, expect } from '../utils/fixtures';

/**
 * Design / visual regression guard for alexpavsky.com.
 *
 * Two layers:
 *   1. Structural invariants — deterministic assertions that encode the design
 *      contract (footer compact, no horizontal overflow, Digest modal behaviour,
 *      nav present, sections render, console clean). These never flake and they
 *      catch the kind of break that actually happened: the 2026-06 footer that
 *      ballooned to full-viewport height. A height assertion fails loudly there.
 *   2. Pixel snapshots — toHaveScreenshot of the STABLE design surfaces (footer,
 *      nav bar, Digest modal). Baselines are generated on the Linux Playwright
 *      image so they match CI. Reduced-motion + animations:'disabled' freeze the
 *      perpetual carousels/animations so the captures are deterministic.
 *
 * When any of these fail in the daily Playwright CI run, bug_report_slack.py
 * posts the diff screenshots to the #bug-reports Slack channel automatically —
 * no extra wiring needed (see .github/workflows/playwright-ci.yml).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// Tolerance absorbs sub-pixel font anti-aliasing; real layout/colour/size
// changes move far more than 2% of pixels and still fail.
const SHOT = { maxDiffPixelRatio: 0.02, animations: 'disabled' as const };

test.describe('Design regression — structural invariants @design', () => {
  test.beforeEach(async ({ page }) => {
    // Reduced motion stops the feed/YouTube carousels and CSS animations, so the
    // page can settle deterministically (also what real a11y users get).
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('footer stays compact — guards the full-viewport bloat regression', async ({ page, commonPage }) => {
    await page.setViewportSize(DESKTOP);
    await commonPage.goto();
    const box = await commonPage.footer.boundingBox();
    expect(box, 'footer should render').not.toBeNull();
    // Compact footer is ~285px. Near-viewport height (e.g. 820px) means the
    // min-height:calc(100vh-80px) bloat is back. Fail well below that.
    expect(box!.height, 'footer height (px) — bloated if ≥450').toBeLessThan(450);
    expect(box!.height, 'footer height (px) — collapsed if ≤120').toBeGreaterThan(120);
  });

  test('no horizontal overflow on desktop or mobile', async ({ page, commonPage }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await commonPage.goto();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow at ${vp.width}px`).toBeLessThanOrEqual(2);
    }
  });

  test('Digest nav opens a centered modal without scrolling the page', async ({ page, commonPage }) => {
    await page.setViewportSize(DESKTOP);
    await commonPage.goto();
    await page.locator('a.nav-link[href="#digest"]').click();

    const modal = page.locator('#digest-modal');
    await expect(modal).toHaveClass(/active/);
    await expect(page.locator('#digest-modal .modal-content')).toBeVisible();

    const state = await page.evaluate(() => {
      const c = document.querySelector('#digest-modal .modal-content')!.getBoundingClientRect();
      return {
        centered: Math.abs((c.left + c.width / 2) - window.innerWidth / 2) < 6,
        didNotScroll: window.scrollY < 5,
        emailFocused: document.activeElement === document.getElementById('digest-modal-email'),
      };
    });
    expect(state.centered, 'modal not horizontally centered').toBe(true);
    expect(state.didNotScroll, 'page scrolled instead of opening modal').toBe(true);
    expect(state.emailFocused, 'email input not focused on open').toBe(true);

    await page.locator('#digest-modal-close').click();
    await expect(modal).not.toHaveClass(/active/);
  });

  test('all primary nav links are present and visible', async ({ page, homePage }) => {
    await page.setViewportSize(DESKTOP);
    await homePage.goto();
    for (const label of ['Feed', 'Explore', 'Tools', 'Challenge', 'Digest']) {
      await expect(
        page.locator(`a.nav-link:has-text("${label}")`).first(),
        `nav link "${label}" missing`,
      ).toBeVisible();
    }
  });

  test('key sections render with non-zero height', async ({ page, homePage }) => {
    await page.setViewportSize(DESKTOP);
    await homePage.goto();
    for (const loc of [homePage.heroSection, homePage.toolsSection, homePage.labSection]) {
      await expect(loc.first()).toBeVisible();
      const box = await loc.first().boundingBox();
      expect(box!.height).toBeGreaterThan(0);
    }
  });

  test('no console errors on load', async ({ page, commonPage }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await commonPage.goto();
    await page.waitForTimeout(2500);
    expect(errors, 'console errors on load:\n' + errors.join('\n')).toHaveLength(0);
  });
});

test.describe('Design regression — visual snapshots @design', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP);
  });

  test('footer looks unchanged', async ({ commonPage }) => {
    await commonPage.goto();
    await commonPage.footer.scrollIntoViewIfNeeded();
    await expect(commonPage.footer).toHaveScreenshot('footer.png', SHOT);
  });

  test('nav bar looks unchanged', async ({ commonPage }) => {
    await commonPage.goto();
    await expect(commonPage.nav).toHaveScreenshot('nav-bar.png', SHOT);
  });

  test('Digest modal looks unchanged', async ({ page, commonPage }) => {
    await commonPage.goto();
    await page.locator('a.nav-link[href="#digest"]').click();
    const content = page.locator('#digest-modal .modal-content');
    await expect(content).toBeVisible();
    await expect(content).toHaveScreenshot('digest-modal.png', SHOT);
  });
});
