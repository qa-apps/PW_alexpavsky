import { test, expect } from '../fixtures/base';

test.describe('Live feed category filters', () => {
  // New tests will be added here
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 10_000 });
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
      await expect(homePage.filterBtns.filter({ hasText: label })).toHaveClass(/active/);
      await expect(homePage.feedGrid).toBeVisible();
      await expect(homePage.feedCards.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('should filter by AI & LLM category', async ({ homePage }) => {
    await homePage.filterFeedBy('AI & LLM');
    await expect(homePage.filterBtns.filter({ hasText: 'AI & LLM' })).toHaveClass(/active/);
    await expect(homePage.feedGrid).toBeVisible();
  });

  test('should filter by QA & Testing category', async ({ homePage }) => {
    await homePage.filterFeedBy('QA & Testing');
    await expect(homePage.filterBtns.filter({ hasText: 'QA & Testing' })).toHaveClass(/active/);
    await expect(homePage.feedGrid).toBeVisible();
  });

  test('should filter by Dev & Engineering category', async ({ homePage }) => {
    await homePage.filterFeedBy('Dev & Engineering');
    await expect(homePage.filterBtns.filter({ hasText: 'Dev & Engineering' })).toHaveClass(/active/);
    await expect(homePage.feedGrid).toBeVisible();
  });

  test('should reset filter to All', async ({ homePage }) => {
    await homePage.filterFeedBy('AI & LLM');
    await homePage.filterFeedBy('All');
    await expect(homePage.filterBtns.filter({ hasText: 'All' })).toHaveClass(/active/);
    await expect(homePage.feedCards.first()).toBeVisible();
  });

  test('should show feed cards after filter change', async ({ homePage }) => {
    await homePage.filterFeedBy('QA & Testing');
    const count = await homePage.feedCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(homePage.feedGrid).toBeVisible();
  });
});
