import { test, expect } from '../utils/fixtures';

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

  test.describe('challenge modal controls', () => {
    test('should show challenge categories', async ({ challengePage }) => {
      await challengePage.open();
      await expect(challengePage.categorySelector).toHaveCount(4);
    });

    test('should select a challenge category', async ({ challengePage }) => {
      await challengePage.open();
      await challengePage.selectCategory('Jailbreak');
      await expect(challengePage.categorySelector.filter({ hasText: 'Jailbreak' })).toHaveClass(/active/);
    });

    test('should enable submit after challenge input', async ({ challengePage }) => {
      await challengePage.open();
      await expect(challengePage.submitBtn).toBeDisabled();
      await challengePage.promptInput.fill('test input');
      await expect(challengePage.submitBtn).toBeEnabled();
    });

    test('should show challenge stats', async ({ challengePage }) => {
      await challengePage.open();
      await expect(challengePage.page.locator('#challenge-stats')).toBeVisible();
    });

    test('should keep empty challenge submit disabled', async ({ challengePage }) => {
      await challengePage.open();
      await challengePage.promptInput.fill('');
      await expect(challengePage.submitBtn).toBeDisabled();
    });
  });

  test.describe('challenge playground modal', () => {
    test('should show playground UI', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await expect(challengePage.page.locator('#challenge-playground')).toBeVisible();
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
      await Promise.all([
        challengePage.page.waitForResponse('**/api/challenge'),
        challengePage.submitPlaygroundPrompt('test'),
      ]);
      await expect(challengePage.playgroundResult).toBeVisible();
    });

    test('should close playground modal', async ({ challengePage }) => {
      await challengePage.gotoPlayground();
      await challengePage.page.locator('#challenge-modal-close').click();
      await expect(challengePage.page.locator('#challenge-modal')).not.toHaveClass(/active/);
    });
  });
});
