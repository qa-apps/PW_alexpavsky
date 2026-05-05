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

  test('should show Break AI challenges', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    const cards = await labPage.breakAIScenarioCards.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should select a challenge scenario', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    const cards = await labPage.breakAIScenarioCards.all();
    if (cards.length > 0) await cards[0].click();
    await expect(labPage.breakAIDescription).toBeVisible();
  });

  test('should submit challenge input', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    await labPage.breakAIInput.fill('test input');
    await labPage.breakAISubmitBtn.click();
    await expect(labPage.breakAIResult).toBeVisible();
  });

  test('should show challenge result', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    await labPage.breakAIInput.fill('challenge');
    await labPage.breakAISubmitBtn.click();
    await expect(labPage.breakAIResult).toContainText('Result');
  });

  test('should handle empty challenge input', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    await labPage.breakAISubmitBtn.click();
    await expect(labPage.breakAIInput).toBeVisible();
  });
});
