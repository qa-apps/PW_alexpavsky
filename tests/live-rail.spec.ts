import { test, expect } from '@playwright/test';

/**
 * LIVE rail (left-edge pill + slide-out vertical news ticker).
 *
 * Companion to feed.spec.ts which covers the main Live Feed section.
 * This file is dedicated to the floating rail widget added to every
 * page: handle visibility, drawer open/close, clickable links, manual
 * wheel/touch scroll, console error hygiene.
 */

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

test.describe('LIVE rail widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + '/');
  });

  test('handle is rendered and visible on every page load', async ({ page }) => {
    const handle = page.locator('#liveHandle');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    // The "LIVE" vertical label must be readable.
    await expect(handle).toContainText('LIVE');
  });

  test('handle is positioned near the top of the viewport (not centered)', async ({ page }) => {
    // We moved it from top:50% to top:140px so more news rows are visible
    // when the drawer opens. Lock that in.
    const box = await page.locator('#liveHandle').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y, 'handle y must be near the top').toBeLessThan(300);
    expect(box!.x, 'handle x must be at the left edge').toBeLessThan(80);
  });

  test('clicking the handle opens the drawer with the news ticker', async ({ page }) => {
    const handle = page.locator('#liveHandle');
    const rail = page.locator('#liveRail');
    await handle.click();
    await expect(rail).toHaveClass(/open/);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    const drawer = page.locator('#liveDrawer');
    await expect(drawer).toBeVisible();
    // CSS transition on width is ~320ms. Wait for it to settle before
    // measuring, otherwise we catch the drawer mid-animation.
    await page.waitForTimeout(500);
    const box = await drawer.boundingBox();
    expect(box!.width, 'drawer must expand past 200px when open').toBeGreaterThan(200);
  });

  test('close button restores collapsed state', async ({ page }) => {
    const rail = page.locator('#liveRail');
    await page.locator('#liveHandle').click();
    await expect(rail).toHaveClass(/open/);
    await page.locator('#liveClose').click();
    await expect(rail).not.toHaveClass(/open/);
    await expect(page.locator('#liveHandle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape key closes the drawer', async ({ page }) => {
    const rail = page.locator('#liveRail');
    await page.locator('#liveHandle').click();
    await expect(rail).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(rail).not.toHaveClass(/open/);
  });

  test('clicking outside the rail closes the drawer', async ({ page }) => {
    const rail = page.locator('#liveRail');
    await page.locator('#liveHandle').click();
    await expect(rail).toHaveClass(/open/);
    // Wait for the slide-open transition so the click lands on a stable
    // layout (handle is at translateX(380px) when fully open).
    await page.waitForTimeout(500);
    // Click on the page body, well outside the drawer + handle.
    // Hero text is near the center of the viewport at x≈800, y≈300.
    await page.mouse.click(800, 300);
    await expect(rail).not.toHaveClass(/open/);
    await expect(page.locator('#liveHandle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking inside the drawer does NOT close it', async ({ page }) => {
    const rail = page.locator('#liveRail');
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(500);
    // Click on a non-link element inside the drawer: the title header.
    // Clicking an <a class="live-item"> would navigate away, so we
    // target the static "LIVE ALERTS" title text instead.
    await page.locator('.live-head .live-title').click();
    await expect(rail).toHaveClass(/open/);
  });

  test('drawer renders at least 3 news items with external links', async ({ page }) => {
    await page.locator('#liveHandle').click();
    // Allow /api/feed fetch to complete and re-render the track.
    await page.waitForTimeout(2500);
    const items = page.locator('.live-item');
    const count = await items.count();
    expect(count, 'expected items to render in the track (live + duplicated copies)').toBeGreaterThanOrEqual(3);
    // Each item must be an anchor with a real http(s) href and open in a new tab.
    const first = items.first();
    await expect(first).toHaveAttribute('href', /^https?:\/\//);
    await expect(first).toHaveAttribute('target', '_blank');
    await expect(first).toHaveAttribute('rel', /noopener/);
  });

  test('items show a category badge and time-ago metadata', async ({ page }) => {
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(2500);
    const first = page.locator('.live-item').first();
    await expect(first.locator('.live-badge'), 'badge must be present').toBeVisible();
    await expect(first.locator('.live-item-title'), 'title must be present').not.toBeEmpty();
    await expect(first.locator('.live-src'), 'source must be present').not.toBeEmpty();
  });

  test('wheel scroll over the viewport shifts the track', async ({ page }) => {
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(1500);

    // Snapshot the track transform, dispatch a wheel event with positive
    // deltaY (down-scroll), and verify the offset moved upward (translateY
    // becomes more negative — same convention as native page scroll).
    const result = await page.evaluate(() => {
      const v = document.querySelector('.live-viewport') as HTMLElement;
      const t = document.getElementById('liveTrack') as HTMLElement;
      // Cancel any pending auto-scroll by setting a known starting transform.
      t.style.transform = 'translateY(0)';
      const before = t.style.transform;
      const r = v.getBoundingClientRect();
      v.dispatchEvent(new WheelEvent('wheel', {
        deltaY: 150, bubbles: true, cancelable: true,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      }));
      return { before, after: t.style.transform };
    });
    // Browsers normalise translateY(0) → translateY(0px). Accept either.
    expect(result.before).toMatch(/^translateY\(0(?:px)?\)$/);
    // After a positive-deltaY wheel, track must have translated upward (Y
    // becomes negative). Anything < 0 is fine — the exact pixel count
    // depends on viewport height and wrap math.
    const m = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec(result.after || '');
    expect(m, `expected translateY in transform, got ${result.after}`).not.toBeNull();
    const y = parseFloat(m![1]);
    expect(y, 'wheel scroll did not move the track').toBeLessThan(0);
  });

  test('touch swipe over the viewport scrolls the track', async ({ page }) => {
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const v = document.querySelector('.live-viewport') as HTMLElement;
      const t = document.getElementById('liveTrack') as HTMLElement;
      t.style.transform = 'translateY(0)';
      const r = v.getBoundingClientRect();
      const cx = r.left + r.width / 2;

      function makeTouchEvent(type: string, y: number) {
        const touch = new Touch({
          identifier: 1, target: v, clientX: cx, clientY: y, pageX: cx, pageY: y,
        });
        return new TouchEvent(type, {
          bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [touch],
          targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch],
        });
      }

      try {
        v.dispatchEvent(makeTouchEvent('touchstart', r.top + 400));
        v.dispatchEvent(makeTouchEvent('touchmove', r.top + 250)); // finger moves UP 150px
        v.dispatchEvent(makeTouchEvent('touchend', r.top + 250));
      } catch (e) {
        return { skip: true, reason: String(e) };
      }
      return { after: t.style.transform };
    });

    // Some test browsers don't construct TouchEvent — skip in that case
    // rather than fail. The real verification is the wheel test above.
    if ('skip' in result) {
      test.skip(true, `Touch events unsupported in this browser: ${result.reason}`);
      return;
    }
    expect(result.after).not.toBe('translateY(0)');
  });

  test('pause button toggles auto-scroll', async ({ page }) => {
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(1500);
    const btn = page.locator('#livePauseBtn');
    await expect(btn).toHaveText('PAUSE');
    await btn.click();
    await expect(btn).toHaveText('PLAY');
    await expect(btn).toHaveClass(/paused/);
    await btn.click();
    await expect(btn).toHaveText('PAUSE');
    await expect(btn).not.toHaveClass(/paused/);
  });

  test('no console errors on page load with the rail present', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE_URL + '/');
    await page.locator('#liveHandle').click();
    await page.waitForTimeout(2500);

    // We only care about errors thrown by OUR code (rail JS or its
    // /api/feed call). Network 404s for upstream RSS images, fonts,
    // analytics pixels, or anything injected by the page itself are
    // noise the rail can't influence — filter them out.
    const ourErrors = errors.filter(e =>
      !/Failed to load resource|fonts\.googleapis|chrome-extension|net::ERR_BLOCKED|favicon|sentry|cdnjs|net::ERR_FAILED/i.test(e)
    );
    expect(ourErrors, `console errors:\n${ourErrors.join('\n')}`).toHaveLength(0);
  });

  test('handle moves with the drawer when opened (stays attached)', async ({ page }) => {
    const handle = page.locator('#liveHandle');
    const closedBox = await handle.boundingBox();
    await handle.click();
    // Wait for the slide-open transition (CSS transition is 320ms).
    await page.waitForTimeout(500);
    const openBox = await handle.boundingBox();
    expect(closedBox).not.toBeNull();
    expect(openBox).not.toBeNull();
    expect(openBox!.x, 'handle must slide right with the drawer').toBeGreaterThan(closedBox!.x + 100);
  });
});
