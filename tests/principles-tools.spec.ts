import { test, expect } from '../fixtures/base';

test.describe('Principles and QA Tools Validation', () => {
  test('should display Essential Principles for Safe AI', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.principlesSection).toBeVisible();
    const principlesCount = await homePage.principleCards.count();
    expect(principlesCount).toBeGreaterThan(0);
    await expect(homePage.principleCards.first().locator('h3')).toBeVisible();
    await expect(homePage.principleCards.first().locator('p')).toBeVisible();
  });

  test('should display Base QA Tools and specific technologies', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.toolsSection).toBeVisible();
    const toolsCount = await homePage.toolCards.count();
    expect(toolsCount).toBeGreaterThan(0);

    const playwrightCard = homePage.toolCards.filter({ hasText: 'Playwright' });
    await expect(playwrightCard).toBeVisible();
    
    const deepEvalCard = homePage.toolCards.filter({ hasText: 'DeepEval' });
    await expect(deepEvalCard).toBeVisible();
  });
});
