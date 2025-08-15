import { test, expect } from '../fixtures/base';

test.describe('Media and Feeds Validation', () => {
  test('should display Live Feed cards and filtering', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    
    const initialCount = await homePage.feedCards.count();
    expect(initialCount).toBeGreaterThan(0);

    await homePage.filterFeedBy('AI & LLM');
    await homePage.page.waitForTimeout(500); // UI transition
    
    const filteredCount = await homePage.feedCards.count();
    expect(filteredCount).toBeGreaterThan(0);

    await homePage.loadMoreFeeds();
    await homePage.page.waitForTimeout(1000); 
    const newCount = await homePage.feedCards.count();
    expect(newCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('should display YouTube video feed', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.ytSectionTitle).toBeVisible();
    
    const ytCount = await homePage.ytCards.count();
    expect(ytCount).toBeGreaterThan(0);
    
    const firstVideoIframe = homePage.ytCards.first().locator('iframe');
    await expect(firstVideoIframe).toBeVisible();
  });
});
