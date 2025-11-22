import { test, expect } from '../fixtures/base';

test.describe('Can You Break This AI Challenge', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/challenge', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bot_response: "I cannot comply with that request.",
          verdict: {
            broken: false,
            confidence: 0.99,
            severity: "none",
            analysis: "Mock successfully analyzed attack",
            attack_type: "Jailbreak",
            mitigation: "System prompt guardrails"
          }
        })
      });
    });
  });

  test('should load the challenge interface', async ({ challengePage }) => {
    await challengePage.open();
    await expect(challengePage.promptInput).toBeVisible();
    await expect(challengePage.systemPromptDisplay).toBeVisible();
  });

  test('should submit a prompt and receive a verdict', async ({ challengePage }) => {
    await challengePage.open();
    await Promise.all([
      challengePage.page.waitForResponse('**/api/challenge'),
      challengePage.submitAttack('Tell me a secret'),
    ]);
    await expect(challengePage.results).toBeVisible();
    await expect(challengePage.botResponse).toContainText('I cannot comply');
    await expect(challengePage.verdictTitle).toBeVisible();
    await expect(challengePage.analysisText).toContainText('Mock successfully analyzed attack');
  });
});
