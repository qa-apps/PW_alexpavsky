import { test, expect } from '../fixtures/base';

test.describe('AI or Human mini-game', () => {
  test('should open the game modal and progress to the next round', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openAiVsHuman();
    await expect(labPage.aiVsHumanModal).toBeVisible();
    const roundBefore = await labPage.aiVsHumanRound.textContent();
    await labPage.aiVsHumanChoices.first().click();
    await expect(labPage.aiVsHumanFeedback).not.toBeEmpty();
    await expect(labPage.aiVsHumanExplanation).not.toBeEmpty();
    await labPage.aiVsHumanNextBtn.click();
    await expect
      .poll(async () => labPage.aiVsHumanRound.textContent())
      .not.toEqual(roundBefore);
  });
});
