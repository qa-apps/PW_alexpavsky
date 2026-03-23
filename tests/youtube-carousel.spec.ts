import { test, expect } from '../fixtures/base';

test.describe('Trending AI and tech videos', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.ytSection).toBeVisible();
    // Wait for real cards (not loading skeletons) to appear
    await expect(homePage.page.locator('.yt-card[href*="youtube.com"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('should render YouTube cards with outbound links', async ({ homePage }) => {
    expect(await homePage.ytCards.count()).toBeGreaterThanOrEqual(3);
    await expect(homePage.ytCards.first()).toHaveAttribute('href', /youtube\.com/);
  });

  test('should open the video modal from a card', async ({ homePage }) => {
    // Wait for real cards (with data-video-id) to load
    const realCard = homePage.page.locator('.yt-card[data-video-id]').first();
    await expect(realCard).toBeVisible({ timeout: 10_000 });
    // Click via JS to trigger the event listener (native click on <a> navigates away)
    await realCard.evaluate((el) => el.click());
    await expect(homePage.page.locator('#yt-modal-overlay.active')).toBeVisible({ timeout: 5_000 });
    // Close button may be outside viewport on fullscreen modal — use keyboard or force click
    await homePage.page.keyboard.press('Escape');
    await expect(homePage.page.locator('#yt-modal-overlay.active')).not.toBeVisible();
  });
});
