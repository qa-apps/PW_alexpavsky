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

  test('should show chatbot toggle button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#chat-toggle').first()).toBeVisible();
  });

  test('should open chatbot panel', async ({ chatbotPage }) => {
    await chatbotPage.openAndConsent();
    await expect(chatbotPage.chatInput).toBeVisible();
  });

  test('should send message in chatbot', async ({ chatbotPage }) => {
    await chatbotPage.openAndConsent();
    await chatbotPage.chatInput.fill('Hello');
    await chatbotPage.chatInput.press('Enter');
    await expect(chatbotPage.userMessages.last()).toContainText('Hello');
  });

  test('should show AI response', async ({ chatbotPage }) => {
    await chatbotPage.openAndConsent();
    await chatbotPage.chatInput.fill('What is Playwright?');
    await chatbotPage.chatInput.press('Enter');
    await expect(chatbotPage.aiMessages.last()).toBeVisible();
  });

  test('should close chatbot panel', async ({ chatbotPage }) => {
    await chatbotPage.openAndConsent();
    await chatbotPage.closeBtn.click();
    await expect(chatbotPage.chatInput).not.toBeVisible();
  });
});
