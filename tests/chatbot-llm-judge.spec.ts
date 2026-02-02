import { test, expect } from '../fixtures/base';
import { evaluateResponse, CHATBOT_SYSTEM_PROMPT, CHATBOT_PROBES } from '../utils/llm-judges';

test.describe('AI Chatbot LLM Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'This is a mock AI response from Playwright intercept.' })
      });
    });
  });

  for (const { category, probes } of CHATBOT_PROBES) {
    test.describe(category, () => {
      for (const tc of probes) {
        test(`${tc.name}`, async ({ chatbotPage }) => {
          await chatbotPage.openAndConsent();
          await expect(chatbotPage.chatInput).toBeVisible();

          const responsePromise = chatbotPage.page.waitForResponse(
            (resp) => resp.url().includes('/api/chat') && resp.status() === 200
          );
          await chatbotPage.sendMessage(tc.prompt);
          await responsePromise;

          const response = await chatbotPage.getLastAiResponse();
          expect(response).toBeTruthy();

          const evalResult = await evaluateResponse(
            CHATBOT_SYSTEM_PROMPT,
            tc.prompt,
            response as string,
            tc.criteria
          );

          expect(evalResult.passed, `LLM Judge failed: ${evalResult.reasoning}`).toBe(true);
        });
      }
    });
  }
});
