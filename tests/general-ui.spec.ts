import { test, expect } from '../fixtures/base';

test.describe('General UI and Navigation', () => {
  test('should load homepage and verify title', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(/Alex Pavsky/);
    await expect(homePage.heroSection).toBeVisible();
  });

  test('should toggle theme', async ({ homePage, page }) => {
    await homePage.goto();
    const before = await page.locator('body').getAttribute('class');
    await homePage.toggleTheme();
    await expect
      .poll(async () => page.locator('body').getAttribute('class'))
      .not.toEqual(before);
  });

  test('should have working navigation links', async ({ homePage }) => {
    await homePage.goto();
    const count = await homePage.navLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(homePage.navLinks.nth(i)).toBeVisible();
      const href = await homePage.navLinks.nth(i).getAttribute('href');
      expect(href?.length).toBeGreaterThan(0);
    }
  });
});
