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

  test('should show principles categories', async ({ labPage }) => {
    await labPage.gotoPrinciples();
    const cats = await labPage.principlesCategories.all();
    expect(cats.length).toBeGreaterThan(0);
  });

  test('should switch principle category', async ({ labPage }) => {
    await labPage.gotoPrinciples();
    const cats = await labPage.principlesCategories.all();
    if (cats.length > 1) await cats[1].click();
    await expect(labPage.principlesContent).toBeVisible();
  });

  test('should show principle content', async ({ labPage }) => {
    await labPage.gotoPrinciples();
    await expect(labPage.principlesContent).toBeVisible();
  });

  test('should have principle titles', async ({ labPage }) => {
    await labPage.gotoPrinciples();
    const titles = await labPage.page.locator('.principle-title').all();
    expect(titles.length).toBeGreaterThan(0);
  });

  test('should navigate back to labs', async ({ labPage }) => {
    await labPage.gotoPrinciples();
    await labPage.page.locator('a[href="/labs"]').first().click();
    await expect(labPage.page).toHaveURL(/\/labs\//);
  });
});
