import { test, expect } from '../fixtures/base';

test.describe('Responsive navigation and mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should open mobile menu and show all primary links', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.navMenuBtn).toBeVisible();
    await homePage.openMobileMenuIfNeeded();
    await expect(homePage.mobileMenu).toHaveClass(/active/);
    for (const label of ['Feed', 'Explore', 'Tools', 'Challenge', 'Digest', 'Break it']) {
      await expect(homePage.mobileMenu.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('should keep lab actions and digest visible on mobile', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.labSection).toBeVisible();
    await expect(homePage.labCards).toHaveCount(5);
    await expect(homePage.newsletterSection).toBeVisible();
  });

  test('should show mobile menu toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.mobile-menu-toggle, [data-testid="mobile-menu"]').first()).toBeVisible();
  });

  test('should open mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('.mobile-menu-toggle').first().click();
    await expect(page.locator('.mobile-nav').first()).toBeVisible();
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('.mobile-menu-toggle').first().click();
    const link = page.locator('.mobile-nav a').first();
    await link.click();
    await expect(page).not.toHaveURL('/');
  });

  test('should show desktop navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('nav a').first()).toBeVisible();
  });

  test('should hide desktop nav on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const desktopNav = page.locator('.desktop-nav, nav > ul').first();
    await expect(desktopNav).not.toBeVisible();
  });
});
