import { test, expect } from '../fixtures/base';

test.describe('Live feed category filters', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
  });

  test('should render all four filter pills', async ({ homePage }) => {
    await expect(homePage.filterBtns).toHaveCount(4);
    await expect(homePage.filterBtns.filter({ hasText: 'All' })).toBeVisible();
    await expect(homePage.filterBtns.filter({ hasText: 'AI & LLM' })).toBeVisible();
    await expect(homePage.filterBtns.filter({ hasText: 'QA & Testing' })).toBeVisible();
    await expect(homePage.filterBtns.filter({ hasText: 'Dev & Engineering' })).toBeVisible();
  });

  test('should switch between categories without emptying the grid', async ({ homePage }) => {
    for (const label of ['AI & LLM', 'QA & Testing', 'Dev & Engineering', 'All']) {
      await homePage.filterFeedBy(label);
      await homePage.page.waitForTimeout(500);
      await expect(homePage.filterBtns.filter({ hasText: label })).toHaveClass(/active/);
      await expect(homePage.feedGrid).toBeVisible();
    }
  });
});
