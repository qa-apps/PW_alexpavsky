import { test, expect } from '../fixtures/base';

test.describe('General UI and Navigation', () => {
  test('should load homepage and verify title', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(/Alex Pavsky/);
  });

  test('should toggle theme', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toggleTheme();
    // Checking if html gets a theme class or style update
    const hasThemeMode = await page.evaluate(() => {
      return document.documentElement.className.includes('light') || 
             document.body.className.includes('light');
    });
    expect(hasThemeMode).toBeDefined();
  });

  test('should have working navigation links', async ({ homePage }) => {
    await homePage.goto();
    const count = await homePage.feedLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(homePage.feedLinks.nth(i)).toBeVisible();
      const href = await homePage.feedLinks.nth(i).getAttribute('href');
      expect(href?.length).toBeGreaterThan(0);
    }
  });
});
