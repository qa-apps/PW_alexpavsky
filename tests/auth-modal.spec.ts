import { test, expect } from '../fixtures/base';

test.describe('Authentication modal flows', () => {
  test('should open, switch tabs and close auth modal', async ({ authPage }) => {
    await authPage.open();
    await expect(authPage.overlay).toBeVisible();
    await expect(authPage.loginForm).toBeVisible();
    await authPage.switchToRegister();
    await expect(authPage.registerForm).toBeVisible();
    await authPage.closeBtn.click();
    await expect(authPage.overlay).not.toHaveClass(/open/);
  });

  test('should submit mocked login and update auth button state', async ({ authPage, page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'pw-token',
          user: { id: 1, name: 'Alex Tester', email: 'alex@example.com' },
        }),
      });
    });

    await authPage.open();
    await authPage.loginEmail.fill('alex@example.com');
    await authPage.loginPassword.fill('Secret123!');
    await authPage.loginSubmit.click();
    await expect(page.locator('#user-menu')).toBeVisible();
    await expect(page.locator('#user-display-name')).toContainText('Alex');
  });
});
