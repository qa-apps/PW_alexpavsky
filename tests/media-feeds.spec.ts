import { test, expect } from '../fixtures/base';

test.describe('Media and Feeds Validation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should display Live Feed cards', async ({ homePage }) => {
    const initialCount = await homePage.feedCards.count();
    expect(initialCount).toBeGreaterThan(0);
  });

  test('should filter feed by category and return to All', async ({ homePage }) => {
    await homePage.filterFeedBy('AI & LLM');
    await expect(homePage.filterBtns.filter({ hasText: 'AI & LLM' })).toHaveClass(/active/);
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 5_000 });
    const filteredCount = await homePage.feedCards.count();
    expect(filteredCount).toBeGreaterThan(0);

    await homePage.filterFeedBy('All');
    await expect(homePage.filterBtns.filter({ hasText: 'All' })).toHaveClass(/active/);
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 5_000 });
    expect(await homePage.feedCards.count()).toBeGreaterThanOrEqual(filteredCount);
  });
});
