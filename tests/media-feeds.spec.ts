import { test, expect } from '../fixtures/base';

test.describe('Media and Feeds Validation', () => {
  test('should display Live Feed cards and filtering', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    await expect(homePage.feedGrid).toBeVisible();
    await expect(homePage.feedCards.first()).toBeVisible();
    const initialCount = await homePage.feedCards.count();
    expect(initialCount).toBeGreaterThan(0);

    await homePage.filterFeedBy('AI & LLM');
    await homePage.page.waitForTimeout(600);
    const filteredCount = await homePage.feedCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    await homePage.filterFeedBy('All');
    await homePage.page.waitForTimeout(600);
    expect(await homePage.feedCards.count()).toBeGreaterThanOrEqual(filteredCount);
  });
});
