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
    const realCard = homePage.page.locator('.yt-card[data-video-id]').first();
    await expect(realCard).toBeVisible({ timeout: 10_000 });
    await realCard.evaluate((el) => (el as HTMLElement).click());
    await expect(homePage.page.locator('#yt-modal-overlay.active')).toBeVisible({ timeout: 5_000 });
    await homePage.page.keyboard.press('Escape');
    await expect(homePage.page.locator('#yt-modal-overlay.active')).not.toBeVisible();
  });

  test('should show YouTube carousel', async ({ homePage }) => {
    await homePage.goto();
    await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
    await expect(homePage.youtubeCarousel).toBeVisible();
  });

  test('should have video cards', async ({ homePage }) => {
    await homePage.goto();
    const cards = await homePage.youtubeVideoCards.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should navigate to next slide', async ({ homePage }) => {
    await homePage.goto();
    await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
    await homePage.youtubeNextBtn.click();
    await expect(homePage.youtubeCarousel).toBeVisible();
  });

  test('should navigate to previous slide', async ({ homePage }) => {
    await homePage.goto();
    await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
    await homePage.youtubePrevBtn.click();
    await expect(homePage.youtubeCarousel).toBeVisible();
  });

  test('should have video links', async ({ homePage }) => {
    await homePage.goto();
    const links = await homePage.youtubeVideoLinks.all();
    expect(links.length).toBeGreaterThan(0);
  });
});
