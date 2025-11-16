import { test, expect } from '../fixtures/base';

test.describe('AI Labs Standard Tools', () => {
  test('should open JSON formatter', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openJsonFormatter();
    await expect(labPage.jsonModal).toBeVisible();
  });

  test('should open Diff Checker', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openDiffChecker();
    await expect(labPage.diffModal).toBeVisible();
  });

  test('should open Chat UI from Lab', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openChatBtn.click();
    await expect(labPage.page.locator('#chat-window')).toBeVisible();
  });
});
