import { test, expect } from '../utils/fixtures';

test.describe('Layout and navigation', () => {
  test('should load homepage and verify title', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(/Alex Pavsky/);
    await expect(homePage.heroSection).toBeVisible();
  });

  test('should toggle theme', async ({ homePage, commonPage }) => {
    await homePage.goto();
    const before = await commonPage.getBodyClass();
    await homePage.toggleTheme();
    await expect.poll(async () => commonPage.getBodyClass()).not.toEqual(before);
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

  test('should have navigation menu', async ({ commonPage }) => {
    await commonPage.goto();
    await expect(commonPage.nav).toBeVisible();
  });

  test('should have site logo', async ({ commonPage }) => {
    await commonPage.goto();
    await expect(commonPage.siteLogo).toBeVisible();
  });

  test('should navigate to about page', async ({ commonPage }) => {
    await commonPage.goto('/about');
    await expect(commonPage.headings.first()).toBeVisible();
  });

  test('should have consistent branding', async ({ commonPage }) => {
    await commonPage.goto();
    const title = await commonPage.page.title();
    expect(title).toContain('Alex');
  });

  test('should have favicon', async ({ commonPage }) => {
    await commonPage.goto();
    await expect(commonPage.favicon).toHaveAttribute('href');
  });

  test.describe('Responsive layout', () => {
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

    test('should show mobile menu toggle', async ({ commonPage }) => {
      await commonPage.page.setViewportSize({ width: 375, height: 667 });
      await commonPage.goto();
      await expect(commonPage.mobileMenuToggle).toBeVisible();
    });

    test('should open mobile menu', async ({ commonPage }) => {
      await commonPage.page.setViewportSize({ width: 375, height: 667 });
      await commonPage.goto();
      await commonPage.openMobileMenu();
      await expect(commonPage.mobileNav).toBeVisible();
    });

    test('should navigate via mobile menu', async ({ commonPage, page }) => {
      await commonPage.page.setViewportSize({ width: 375, height: 667 });
      await commonPage.goto();
      await commonPage.openMobileMenu();
      await commonPage.mobileNavLinks.first().click();
      await expect(page).not.toHaveURL('/');
    });

    test('should show desktop navigation', async ({ commonPage }) => {
      await commonPage.page.setViewportSize({ width: 1280, height: 720 });
      await commonPage.goto();
      await expect(commonPage.navLinks.first()).toBeVisible();
    });

    test('should hide desktop nav on mobile', async ({ commonPage }) => {
      await commonPage.page.setViewportSize({ width: 375, height: 667 });
      await commonPage.goto();
      await expect(commonPage.desktopNav).not.toBeVisible();
    });
  });
});
