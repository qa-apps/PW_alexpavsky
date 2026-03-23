import { test, expect } from '../fixtures/base';

test.describe('Trending AI and tech videos', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.ytSection).toBeVisible();
    await expect(homePage.ytCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should render YouTube cards with outbound links', async ({ homePage }) => {
    expect(await homePage.ytCards.count()).toBeGreaterThanOrEqual(3);
    await expect(homePage.ytCards.first()).toHaveAttribute('href', /youtube\.com/);
  });

  test('should open the video modal from a card', async ({ homePage }) => {
    await homePage.ytCards.first().click();
    await expect(homePage.ytModal).toBeVisible({ timeout: 5_000 });
    await homePage.ytModalClose.click();
    await expect(homePage.ytModal).not.toBeVisible();
  });
});
