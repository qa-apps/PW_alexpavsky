import { test, expect } from '../fixtures/base';

const TEST_EMAIL = 'test_email_001007@proton.me';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Secret123!';
const MOCK_USER_NAME = 'Alex Tester';

const authBtn = '#auth-btn';
const loginEmail = '#login-form #login-email';
const loginPassword = '#login-form #login-password';
const loginSubmit = '#login-form button[type="submit"]';
const userMenu = '#user-menu';
const userDisplayName = '#user-display-name';
const dashboardLink = '#user-dashboard-link';
const dashboardOverlay = '#user-dashboard-overlay';
const dashboardUserMeta = '#dashboard-user-meta';
const logoutLink = '#user-logout-link';

test.describe('Login Dashboard Flow', () => {
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

  test('user can login and sees dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator(authBtn).click();
    await expect(page.locator(loginEmail)).toBeVisible();
    await page.locator(loginEmail).fill(TEST_EMAIL);
    await page.locator(loginPassword).fill(TEST_PASSWORD);
    await page.locator(loginSubmit).click();
    await expect(page.locator(userMenu)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(userDisplayName)).toContainText('Alex');
    await page.locator(userMenu).click();
    await expect(page.locator(dashboardLink)).toBeVisible();
    await page.locator(dashboardLink).click();
    await expect(page.locator(dashboardOverlay)).toBeVisible();
    await expect(page.locator(dashboardUserMeta)).toContainText('Alex');
  });

  test('user can logout and sees login button', async ({ page }) => {
    await page.goto('/');
    await page.locator(authBtn).click();
    await expect(page.locator(loginEmail)).toBeVisible();
    await page.locator(loginEmail).fill(TEST_EMAIL);
    await page.locator(loginPassword).fill(TEST_PASSWORD);
    await page.locator(loginSubmit).click();
    await expect(page.locator(userMenu)).toBeVisible({ timeout: 10000 });
    await page.locator(userMenu).click();
    await page.locator(logoutLink).click();
    await expect(page.locator(authBtn)).toBeVisible();
  });
});
