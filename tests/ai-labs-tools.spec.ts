import { test, expect } from '../fixtures/base';

test.describe('AI Labs Standard Tools', () => {
  test('should open Attack Generator', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openAttackGenerator();
    await expect(labPage.attackgenModal).toBeVisible();
  

  test('should open Prompt Injection Tester', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openPitestBtn.click();
    await expect(labPage.pitestModal).toBeVisible();
  });

  test('should open Challenge Modal', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openChallengeBtn.click();
    await expect(labPage.challengeModal).toBeVisible();
  });

  test('should navigate to JSON Diff tool', async ({ labPage }) => {
    await labPage.gotoJSONDiff();
    await expect(labPage.jsonDiffTool).toBeVisible();
  });

  test('should navigate to Break AI section', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    await expect(labPage.breakAISection).toBeVisible();
  });

  test('should navigate to AI Or Human section', async ({ labPage }) => {
    await labPage.gotoAIOrHuman();
    await expect(labPage.aiOrHumanSection).toBeVisible();
  });
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

  test('should show all AI lab tools', async ({ labPage }) => {
    await labPage.goto();
    const cards = await labPage.gptCards.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should open JSON Diff tool', async ({ labPage }) => {
    await labPage.gotoJSONDiff();
    await expect(labPage.jsonDiffLeft).toBeVisible();
    await expect(labPage.jsonDiffRight).toBeVisible();
  });

  test('should open Break AI section', async ({ labPage }) => {
    await labPage.gotoBreakAI();
    await expect(labPage.breakAISection).toBeVisible();
  });

  test('should open AI Or Human section', async ({ labPage }) => {
    await labPage.gotoAIOrHuman();
    await expect(labPage.aiOrHumanSection).toBeVisible();
  });

  test('should open Prompt Injection Tester', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openPromptInjectionModal();
    await expect(labPage.promptInjectionInput).toBeVisible();
  });
});
