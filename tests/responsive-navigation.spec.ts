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
});
