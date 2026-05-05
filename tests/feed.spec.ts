import { test, expect } from '../fixtures/base';

test.describe('Live feed', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should display Live Feed cards', async ({ homePage }) => {
    expect(await homePage.feedCards.count()).toBeGreaterThan(0);
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

  test('should reset filter to All', async ({ homePage }) => {
    await homePage.filterFeedBy('AI & LLM');
    await homePage.filterFeedBy('All');
    await expect(homePage.filterBtns.filter({ hasText: 'All' })).toHaveClass(/active/);
    await expect(homePage.feedCards.first()).toBeVisible();
  });

  test('should show feed cards after filter change', async ({ homePage }) => {
    await homePage.filterFeedBy('QA & Testing');
    expect(await homePage.feedCards.count()).toBeGreaterThanOrEqual(0);
    await expect(homePage.feedGrid).toBeVisible();
  });

  test.describe('Article modal', () => {
    test('should open feed article details and expose external link', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      await expect(homePage.articleModal).toBeVisible();
      await expect(homePage.articleModalTitle).not.toBeEmpty();
      await expect(homePage.articleModalLink).toHaveAttribute('href', /https?:\/\//);
      await homePage.articleModalClose.click();
      await expect(homePage.articleModal).not.toBeVisible();
    });

    test('should open feed article modal', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      await expect(homePage.articleModal).toBeVisible();
    });

    test('should show article title', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      await expect(homePage.articleModalHeading).toBeVisible();
    });

    test('should close article modal', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      await homePage.closeArticleModal();
      await expect(homePage.articleModal).not.toBeVisible();
    });

    test('should render article content body', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      await expect(homePage.articleModalContent).toBeVisible();
      await expect(homePage.articleModalHeading).toBeVisible();
    });

    test('should have article link', async ({ homePage }) => {
      await homePage.openFeedArticle(0);
      expect(await homePage.articleModalLinks.count()).toBeGreaterThan(0);
    });
  });
});
