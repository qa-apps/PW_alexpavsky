import { test, expect } from '../fixtures/base';

test.describe('Challenge playground UI states', () => {
  test('should list all attack categories and update the system prompt copy', async ({ challengePage }) => {
    await challengePage.open();
    await expect(challengePage.categorySelector).toHaveCount(4);
    const before = await challengePage.systemPromptText.textContent();
    await challengePage.selectCategory('Hallucination');
    await challengePage.page.waitForTimeout(400);
    const after = await challengePage.systemPromptText.textContent();
    await expect(challengePage.categorySelector.filter({ hasText: 'Hallucination' })).toHaveClass(/active/);
    expect(after).not.toBe(before);
  });
});
