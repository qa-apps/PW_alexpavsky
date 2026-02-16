import { test, expect } from '../fixtures/base';

test.describe('AI assistant widget UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'Playwright widget mock response.' }),
      });
    });
  });

  test('should open terms panel and return back to consent screen', async ({ chatbotPage }) => {
    await chatbotPage.open();
    await expect(chatbotPage.window).toBeVisible();
    await expect(chatbotPage.consentPanel).toBeVisible();
    await chatbotPage.termsLink.dispatchEvent('click');
    await expect(chatbotPage.termsPanel).toBeVisible();
    await chatbotPage.termsBackBtn.click({ force: true });
    await expect(chatbotPage.consentPanel).toBeVisible();
  });

  test('should accept consent and exchange a message', async ({ chatbotPage }) => {
    await chatbotPage.openAndConsent();
    await chatbotPage.sendMessage('Give me a quick AI testing tip.');
    await expect(chatbotPage.userMessages.last()).toContainText('Give me a quick AI testing tip.');
    await expect(chatbotPage.aiMessages.last()).toContainText('Playwright widget mock response.');
  });
});
