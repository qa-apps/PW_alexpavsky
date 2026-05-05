import { test, expect } from '../fixtures/base';

const categories = ['Jailbreak', 'Hallucination', 'Prompt Injection', 'Bias Detection'];

test.describe('AI challenge', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/challenge', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bot_response: 'I cannot comply with that request.',
          verdict: {
            broken: false,
            confidence: 0.99,
            severity: 'none',
            analysis: 'Mock successfully analyzed attack',
            attack_type: 'Jailbreak',
            mitigation: 'System prompt guardrails',
          },
        }),
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

  test('should list all attack categories and update the system prompt copy', async ({ challengePage }) => {
    await challengePage.open();
    await expect(challengePage.categorySelector).toHaveCount(4);
    const before = await challengePage.systemPromptText.textContent();
    await challengePage.selectCategory('Hallucination');
    await expect(challengePage.categorySelector.filter({ hasText: 'Hallucination' })).toHaveClass(/active/);
    await expect(challengePage.systemPromptText).not.toHaveText(before || '', { timeout: 3_000 });
  });

  test('should cycle through all categories and highlight the active one', async ({ challengePage }) => {
    await challengePage.open();
    for (const cat of categories) {
      await challengePage.selectCategory(cat);
      await expect(challengePage.categorySelector.filter({ hasText: cat })).toHaveClass(/active/);
      await expect(challengePage.systemPromptText).not.toBeEmpty();
    }
  });

  test.describe.skip('unpublished Break AI route', () => {
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

  test.describe.skip('unpublished challenge playground route', () => {
    test('should show playground UI', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await expect(challengePage.playgroundHeading).toBeVisible();
    });

    test('should have input field', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await expect(challengePage.playgroundInput).toBeVisible();
    });

    test('should have submit button', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await expect(challengePage.playgroundSubmitBtn).toBeVisible();
    });

    test('should show results after submit', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await challengePage.submitPlaygroundPrompt('test');
      await expect(challengePage.playgroundResult).toBeVisible();
    });

    test('should have navigation back to labs', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await expect(challengePage.playgroundLabsLink).toBeVisible();
    });
  });
});
