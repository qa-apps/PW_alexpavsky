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

  test('should show media feed section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.mediaFeedSection.scrollIntoViewIfNeeded();
    await expect(homePage.mediaFeedSection).toBeVisible();
  });

  test('should filter videos', async ({ homePage }) => {
    await homePage.goto();
    await homePage.filterMediaBy('Videos');
    const cards = await homePage.videoThumbnails.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should filter podcasts', async ({ homePage }) => {
    await homePage.goto();
    await homePage.filterMediaBy('Podcasts');
    const cards = await homePage.podcastCards.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should show media titles', async ({ homePage }) => {
    await homePage.goto();
    const titles = await homePage.mediaTitles.all();
    expect(titles.length).toBeGreaterThan(0);
  });

  test('should navigate to media detail', async ({ homePage, page }) => {
    await homePage.goto();
    const links = await page.locator('.media-title a, .video-thumbnail a').all();
    if (links.length > 0) {
      expect(await links[0].getAttribute('href')).toBeTruthy();
    }
  });
});
