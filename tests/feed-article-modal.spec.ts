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

  test('should open feed article modal', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.feed-card').all();
    if (cards.length > 0) await cards[0].click();
    await expect(page.locator('.article-modal').first()).toBeVisible();
  });

  test('should show article title', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.feed-card').all();
    if (cards.length > 0) await cards[0].click();
    await expect(page.locator('.article-modal h2, .article-modal h3').first()).toBeVisible();
  });

  test('should close article modal', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.feed-card').all();
    if (cards.length > 0) await cards[0].click();
    await page.locator('.modal-close, .article-modal .close').first().click();
    await expect(page.locator('.article-modal').first()).not.toBeVisible();
  });

  test('should scroll article content', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.feed-card').all();
    if (cards.length > 0) await cards[0].click();
    const modal = page.locator('.article-modal').first();
    await modal.evaluate(el => el.scrollTop = 100);
    expect(await modal.evaluate(el => el.scrollTop)).toBeGreaterThanOrEqual(100);
  });

  test('should have article link', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.feed-card').all();
    if (cards.length > 0) await cards[0].click();
    const links = await page.locator('.article-modal a').all();
    expect(links.length).toBeGreaterThan(0);
  });
});
