import { test, expect } from '../fixtures/base';

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
        class: String(el.className || '').slice(0, 100),
        id: el.id,
        testid: el.getAttribute('data-testid'),
        href: String((el as HTMLAnchorElement).href || '').slice(0, 100),
      }));
    });

    console.log('INTERACTIVE ELEMENTS ===');
    console.log(JSON.stringify(elements, null, 2));

    expect(true).toBe(true);
  });

  test('inspect homepage elements', async ({ page }) => {
    await page.goto('https://alexpavsky.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/01-home.png', fullPage: true });

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('=== PAGE TEXT ===');
    console.log(bodyText.slice(0, 3000));

    const allElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button, input, [role="button"], header *, nav *')).map(el => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 100),
        class: String(el.className || '').slice(0, 100),
        id: el.id,
        href: String((el as HTMLAnchorElement).href || '').slice(0, 100),
      })).filter(e => e.text.length > 0 || e.id || e.class.length > 0);
    });

    console.log('=== ALL ELEMENTS ===');
    console.log(JSON.stringify(allElements, null, 2));

    expect(true).toBe(true);
  });

  test('should inspect hero section', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.heroHeadline).toBeVisible();
  });

  test('should inspect live feed section', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
  });

  test('should inspect principles section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.principleCards.first().scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.first()).toBeVisible();
  });

  test('should inspect media feeds section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.mediaFeedSection.scrollIntoViewIfNeeded();
    await expect(homePage.mediaFeedSection).toBeVisible();
  });

  test('should inspect footer section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.footerSection.scrollIntoViewIfNeeded();
    await expect(homePage.footerSection).toBeVisible();
  });
});
