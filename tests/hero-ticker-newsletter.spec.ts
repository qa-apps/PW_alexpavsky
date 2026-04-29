import { test, expect } from '../fixtures/base';
import type { Page, Route } from '@playwright/test';

test.describe('Hero ticker and digest signup', () => {
  async function mockSubscribe(page: Page, status = 200, body = { message: 'Weekly digest enabled.' }, requests: unknown[] = []) {
    await page.route('**/api/subscribe', async (route: Route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }

  test('should render a populated live ticker', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.tickerItems.first()).toBeVisible();
    expect(await homePage.tickerItems.count()).toBeGreaterThanOrEqual(1);
  });

  test('should submit newsletter form and show success message', async ({ homePage, page }) => {
    const requests: unknown[] = [];
    await mockSubscribe(page, 200, { message: 'Weekly digest enabled.' }, requests);

    await homePage.goto();
    await expect(homePage.newsletterSection).toBeVisible();
    await homePage.subscribe('alex@example.com');
    await expect(homePage.newsletterSuccess).toBeVisible();
    expect(requests).toContainEqual({ email: 'alex@example.com' });
  });

  test('should rotate ticker items', async ({ homePage }) => {
    await homePage.goto();
    const itemTexts = await homePage.tickerItems.allTextContents();
    expect(new Set(itemTexts.map((text) => text.trim()).filter(Boolean)).size).toBeGreaterThan(1);
  });

  test('should show newsletter input', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.newsletterEmail).toBeVisible();
  });

  test('should validate email format', async ({ homePage }) => {
    await homePage.goto();
    await homePage.subscribe('invalid-email');
    await expect.poll(() => homePage.newsletterEmail.evaluate((input) => (input as HTMLInputElement).validity.valid)).toBe(false);
  });

  test('should accept valid email', async ({ homePage, page }) => {
    await mockSubscribe(page);
    await homePage.goto();
    await homePage.subscribe('test@example.com');
    await expect(homePage.newsletterSuccess).toBeVisible();
  });

  test('should show success after submit', async ({ homePage, page }) => {
    await mockSubscribe(page);
    await homePage.goto();
    await homePage.subscribe('test2@example.com');
    await expect(homePage.newsletterSuccess).toBeVisible();
  });
});
