import { test, expect } from '../fixtures/base';

test.describe('Challenge playground UI states', () => {
  test('should list all attack categories and update the system prompt copy', async ({ challengePage }) => {
    await challengePage.open();
    await expect(challengePage.categorySelector).toHaveCount(4);
    const before = await challengePage.systemPromptText.textContent();
    await challengePage.selectCategory('Hallucination');
    await expect(challengePage.categorySelector.filter({ hasText: 'Hallucination' })).toHaveClass(/active/);
    // System prompt text should change after selecting a different category
    await expect(challengePage.systemPromptText).not.toHaveText(before || '', { timeout: 3_000 });
  });

  const categories = ['Jailbreak', 'Hallucination', 'Prompt Injection', 'Bias Detection'];

  test('should cycle through all categories and highlight the active one', async ({ challengePage }) => {
    await challengePage.open();
    for (const cat of categories) {
      await challengePage.selectCategory(cat);
      await expect(challengePage.categorySelector.filter({ hasText: cat })).toHaveClass(/active/);
      await expect(challengePage.systemPromptText).not.toBeEmpty();
    }
  });
});
