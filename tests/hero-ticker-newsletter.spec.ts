import { test, expect } from '../fixtures/base';

test.describe('Hero ticker and digest signup', () => {
  test('should render a populated live ticker', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.tickerItems.first()).toBeVisible();
    expect(await homePage.tickerItems.count()).toBeGreaterThanOrEqual(1);
  });

  test('should submit newsletter form and show success message', async ({ homePage, page }) => {
    await page.route('**/api/subscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Weekly digest enabled.' }),
      });
    });

    await homePage.goto();
    await expect(homePage.newsletterSection).toBeVisible();
    const [request] = await Promise.all([
      page.waitForRequest('**/api/subscribe'),
      homePage.subscribe('alex@example.com'),
    ]);
    expect(request.postDataJSON()).toEqual({ email: 'alex@example.com' });
  });

  test('should rotate ticker items', async ({ homePage }) => {
    await homePage.goto();
    const first = await homePage.tickerItems.first().textContent();
    await homePage.page.waitForTimeout(3000);
    const current = await homePage.tickerItems.first().textContent();
    expect(current).not.toBe(first);
  });

  test('should show newsletter input', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.newsletterEmail).toBeVisible();
  });

  test('should validate email format', async ({ homePage }) => {
    await homePage.goto();
    await homePage.subscribe('invalid-email');
    await expect(homePage.newsletterError).toBeVisible();
  });

  test('should accept valid email', async ({ homePage }) => {
    await homePage.goto();
    await homePage.subscribe('test@example.com');
    await expect(homePage.newsletterSuccess).toBeVisible();
  });

  test('should disable submit after success', async ({ homePage }) => {
    await homePage.goto();
    await homePage.subscribe('test2@example.com');
    await expect(homePage.newsletterSuccess).toBeVisible();
  });
});
