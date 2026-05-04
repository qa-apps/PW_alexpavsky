import { test, expect } from '../fixtures/base';

test.describe('AI Labs Standard Tools', () => {
  test('should open Attack Generator', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openAttackGenerator();
    await expect(labPage.attackgenModal).toBeVisible();
  });

  test('should open Hallucination Analyzer', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openHallucinationAnalyzer();
    await expect(labPage.hallucinationModal).toBeVisible();
  });

  test('should open Chat UI from Lab', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openChatBtn.click();
    await expect(labPage.page.locator('#chat-window')).toBeVisible();
  });
});
