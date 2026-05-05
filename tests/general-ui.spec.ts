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

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('should have site logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-logo, [data-testid="site-logo"]').first()).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should have consistent branding', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('Alex');
  });

  test('should have favicon', async ({ page }) => {
    await page.goto('/');
    const favicon = await page.locator('link[rel="icon"], link[rel="shortcut icon"]').first();
    await expect(favicon).toHaveAttribute('href');
  });
});
