import { test, expect } from '@playwright/test';

// Headless site inspection - run first to discover selectors

test.describe('Inspect alexpavsky.com DOM', () => {
  test('capture homepage structure', async ({ page }) => {
    await page.goto('https://alexpavsky.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/inspect-home.png', fullPage: true });

    const elements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, a, input, [role="button"], [data-testid], .profile, .login, .user, .account'));
      return all.map(el => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 100),
        class: el.className?.slice(0, 100),
        id: el.id,
        testid: el.getAttribute('data-testid'),
        href: (el as HTMLAnchorElement).href,
      }));
    });

    console.log('INTERACTIVE ELEMENTS ===');
    console.log(JSON.stringify(elements, null, 2));

    expect(true).toBe(true);
  });
});
