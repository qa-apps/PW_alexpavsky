import { test, expect } from '../fixtures/base';

test.describe('Feed article modal', () => {
  test('should open feed article details and expose external link', async ({ homePage }) => {
    await homePage.goto();
    await homePage.openFeedArticle(0);
    await expect(homePage.articleModal).toBeVisible();
    await expect(homePage.articleModalTitle).not.toBeEmpty();
    await expect(homePage.articleModalLink).toHaveAttribute('href', /https?:\/\//);
    await homePage.articleModalClose.click();
    await expect(homePage.articleModal).not.toBeVisible();
  });
});
