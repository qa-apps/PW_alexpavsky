import { test, expect } from '../fixtures/base';

const TEST_EMAIL = 'test_email_001007@proton.me';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Secret123!';
const MOCK_USER_NAME = 'Alex Tester';

test.describe('Authentication', () => {
  test.describe('Modal flows', () => {
    test('should open, switch tabs and close auth modal', async ({ authPage }) => {
      await authPage.open();
      await expect(authPage.overlay).toBeVisible();
      await expect(authPage.loginForm).toBeVisible();
      await authPage.switchToRegister();
      await expect(authPage.registerForm).toBeVisible();
      await authPage.closeBtn.click();
      await expect(authPage.overlay).not.toHaveClass(/open/);
    });

    test('should show login form fields', async ({ authPage }) => {
      await authPage.open();
      await expect(authPage.loginEmail).toBeVisible();
      await expect(authPage.loginPassword).toBeVisible();
      await expect(authPage.loginSubmit).toBeVisible();
    });

    test('should show register form fields after switch', async ({ authPage }) => {
      await authPage.open();
      await authPage.switchToRegister();
      await expect(authPage.registerForm).toBeVisible();
    });

    test('should close modal on close button click', async ({ authPage }) => {
      await authPage.open();
      await expect(authPage.overlay).toBeVisible();
      await authPage.closeBtn.click();
      await expect(authPage.overlay).not.toHaveClass(/open/);
    });

    test('should not submit login with empty fields', async ({ authPage }) => {
      await authPage.open();
      await authPage.loginEmail.fill('');
      await authPage.loginPassword.fill('');
      await authPage.loginSubmit.click();
      await expect(authPage.loginEmail).toBeVisible();
    });

    test('should maintain form state after switching tabs', async ({ authPage }) => {
      await authPage.open();
      await authPage.loginEmail.fill('test@example.com');
      await authPage.switchToRegister();
      await authPage.switchToLogin();
      await expect(authPage.loginEmail).toHaveValue('test@example.com');
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
      await authPage.submitLogin('alex@example.com', 'Secret123!');
      await expect(authPage.userMenu).toBeVisible();
      await expect(authPage.userDisplayName).toContainText('Alex');
    });
  });

  test.describe('Dashboard flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'pw-token',
            user: { id: 1, name: MOCK_USER_NAME, email: TEST_EMAIL },
          }),
        });
      });

      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      });
    });

    test('user can login and sees dashboard', async ({ authPage }) => {
      await authPage.open();
      await expect(authPage.loginEmail).toBeVisible();
      await authPage.submitLogin(TEST_EMAIL, TEST_PASSWORD);
      await expect(authPage.userMenu).toBeVisible({ timeout: 10_000 });
      await expect(authPage.userDisplayName).toContainText('Alex');
      await authPage.openDashboard();
      await expect(authPage.dashboardOverlay).toBeVisible();
      await expect(authPage.dashboardUserMeta).toContainText('Alex');
    });

    test('user can logout and sees login button', async ({ authPage }) => {
      await authPage.open();
      await expect(authPage.loginEmail).toBeVisible();
      await authPage.submitLogin(TEST_EMAIL, TEST_PASSWORD);
      await expect(authPage.userMenu).toBeVisible({ timeout: 10_000 });
      await authPage.logout();
      await expect(authPage.authBtn).toBeVisible();
    });
  });
});
