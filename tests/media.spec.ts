import { test, expect } from '../fixtures/base';

test.describe('Media', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test.describe.skip('legacy media feed section', () => {
    test('should show media feed section', async ({ homePage }) => {
      await homePage.mediaFeedSection.scrollIntoViewIfNeeded();
      await expect(homePage.mediaFeedSection).toBeVisible();
    });

    test('should filter videos', async ({ homePage }) => {
      await homePage.filterMediaBy('Videos');
      expect((await homePage.videoThumbnails.all()).length).toBeGreaterThan(0);
    });

    test('should filter podcasts', async ({ homePage }) => {
      await homePage.filterMediaBy('Podcasts');
      expect((await homePage.podcastCards.all()).length).toBeGreaterThan(0);
    });

    test('should show media titles', async ({ homePage }) => {
      expect((await homePage.mediaTitles.all()).length).toBeGreaterThan(0);
    });

    test('should navigate to media detail', async ({ homePage }) => {
      const links = await homePage.mediaDetailLinks.all();
      if (links.length > 0) {
        expect(await links[0].getAttribute('href')).toBeTruthy();
      }
    });
  });

  test.describe('YouTube carousel', () => {
    test.beforeEach(async ({ homePage }) => {
      await expect(homePage.ytSection).toBeVisible();
      await expect(homePage.youtubeOutboundCards.first()).toBeVisible({ timeout: 15_000 });
    });

    test('should render YouTube cards with outbound links', async ({ homePage }) => {
      expect(await homePage.ytCards.count()).toBeGreaterThanOrEqual(3);
      await expect(homePage.ytCards.first()).toHaveAttribute('href', /youtube\.com/);
    });

    test('should open the video modal from a card', async ({ homePage }) => {
      await expect(homePage.youtubeRealCards.first()).toBeVisible({ timeout: 10_000 });
      await homePage.openFirstYoutubeVideoModal();
      await expect(homePage.youtubeModalOverlay).toBeVisible({ timeout: 5_000 });
      await homePage.page.keyboard.press('Escape');
      await expect(homePage.youtubeModalOverlay).not.toBeVisible();
    });

    test('should show YouTube carousel', async ({ homePage }) => {
      await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
      await expect(homePage.youtubeCarousel).toBeVisible();
    });

    test('should have video cards', async ({ homePage }) => {
      expect((await homePage.youtubeVideoCards.all()).length).toBeGreaterThan(0);
    });

    test('should navigate to next slide', async ({ homePage }) => {
      await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
      await homePage.youtubeNextBtn.click();
      await expect(homePage.youtubeCarousel).toBeVisible();
    });

    test('should navigate to previous slide', async ({ homePage }) => {
      await homePage.youtubeCarousel.scrollIntoViewIfNeeded();
      await homePage.youtubePrevBtn.click();
      await expect(homePage.youtubeCarousel).toBeVisible();
    });

    test('should have video links', async ({ homePage }) => {
      expect((await homePage.youtubeVideoLinks.all()).length).toBeGreaterThan(0);
    });
  });
});
