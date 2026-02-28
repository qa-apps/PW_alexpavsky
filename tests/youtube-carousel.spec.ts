import { test, expect } from '../fixtures/base';

test.describe('Trending AI and tech videos', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.ytSection).toBeVisible();
    await homePage.page.waitForTimeout(800);
  });

  test('should render YouTube cards with outbound links', async ({ homePage }) => {
    expect(await homePage.ytCards.count()).toBeGreaterThanOrEqual(3);
    await expect(homePage.ytCards.first()).toHaveAttribute('href', /youtube\.com/);
  });

  test('should open the video modal from a card', async ({ homePage }) => {
    const attempts = Math.min(await homePage.ytCards.count(), 3);
    for (let i = 0; i < attempts; i += 1) {
      await homePage.ytCards.nth(i).evaluate((element) => {
        (element as HTMLAnchorElement).click();
      });
      await homePage.page.waitForTimeout(600);
      if (await homePage.ytModal.isVisible()) {
        break;
      }
    }
    await expect(homePage.ytModal).toBeVisible();
    await homePage.ytModalClose.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(homePage.ytModal).not.toBeVisible();
  });
});
