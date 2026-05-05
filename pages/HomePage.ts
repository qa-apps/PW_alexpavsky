import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly navLinks: Locator;
  readonly navMenuBtn: Locator;
  readonly mobileMenu: Locator;
  readonly heroSection: Locator;
  readonly tickerItems: Locator;
  readonly liveFeedSection: Locator;
  readonly feedGrid: Locator;
  readonly feedCards: Locator;
  readonly filterBtns: Locator;
  readonly articleModal: Locator;
  readonly articleModalTitle: Locator;
  readonly articleModalLink: Locator;
  readonly articleModalClose: Locator;
  readonly ytSection: Locator;
  readonly ytCards: Locator;
  readonly principlesSection: Locator;
  readonly principleCards: Locator;
  readonly toolsSection: Locator;
  readonly toolCards: Locator;
  readonly labSection: Locator;
  readonly labCards: Locator;
  readonly newsletterSection: Locator;
  readonly newsletterForm: Locator;
  readonly newsletterEmail: Locator;
  readonly mediaFeedSection: Locator;
  readonly videoThumbnails: Locator;
  readonly podcastCards: Locator;
  readonly mediaTitles: Locator;
  readonly youtubeCarousel: Locator;
  readonly youtubeVideoCards: Locator;
  readonly youtubeNextBtn: Locator;
  readonly youtubePrevBtn: Locator;
  readonly youtubeVideoLinks: Locator;
  readonly heroHeadline: Locator;
  readonly heroSubtitle: Locator;
  readonly newsletterError: Locator;
  readonly newsletterSuccess: Locator;
  readonly footerSection: Locator;
  readonly contactSection: Locator;
  readonly rulesOfThumbSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('#theme-toggle, [aria-label*="theme"], .theme-toggle').first();
    this.navLinks = page.locator('nav .nav-link');
    this.navMenuBtn = page.locator('#nav-menu-btn');
    this.mobileMenu = page.locator('#mobile-menu');
    this.heroSection = page.locator('#hero, .hero').first();
    this.tickerItems = page.locator('.ticker-item');
    this.liveFeedSection = page.locator('#feed');
    this.feedGrid = page.locator('#feed-grid');
    this.feedCards = page.locator('.feed-card');
    this.filterBtns = page.locator('.filter-btn');
    this.articleModal = page.locator('#article-modal-overlay');
    this.articleModalTitle = page.locator('#article-modal-title');
    this.articleModalLink = page.locator('#article-modal-link');
    this.articleModalClose = page.locator('#article-modal-close');
    this.ytSection = page.locator('#yt-carousel, #videos').first();
    this.ytCards = page.locator('.yt-card');
    this.principlesSection = page.locator('#explore');
    this.principleCards = page.locator('#explore .explore-card');
    this.toolsSection = page.locator('#tools');
    this.toolCards = page.locator('#tools .tool-card');
    this.labSection = page.locator('#lab');
    this.labCards = page.locator('#lab .lab-card');
    this.newsletterSection = page.locator('#digest');
    this.newsletterForm = page.locator('#newsletter-form');
    this.newsletterEmail = page.locator('#newsletter-email');
    this.mediaFeedSection = page.locator('#media-feed');
    this.videoThumbnails = page.locator('.video-thumbnail');
    this.podcastCards = page.locator('.podcast-card');
    this.mediaTitles = page.locator('.media-title');
    this.youtubeCarousel = page.locator('#youtube-carousel');
    this.youtubeVideoCards = page.locator('.youtube-video-card');
    this.youtubeNextBtn = page.locator('#carousel-next');
    this.youtubePrevBtn = page.locator('#carousel-prev');
    this.youtubeVideoLinks = page.locator('.youtube-video-card a');
    this.heroHeadline = page.locator('#hero-headline');
    this.heroSubtitle = page.locator('#hero-subtitle');
    this.newsletterError = page.locator('#newsletter-error');
    this.newsletterSuccess = page.locator('#newsletter-success');
    this.footerSection = page.locator('footer');
    this.contactSection = page.locator('#contact');
    this.rulesOfThumbSection = page.locator('#rules-of-thumb');
  }

  async filterMediaBy(label: string) {
    await this.page.locator('.media-filter-btn:has-text("' + label + '")').click();
  }

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async openMobileMenuIfNeeded() {
    if (await this.navMenuBtn.isVisible()) {
      await this.navMenuBtn.click();
    }
  }

  async filterFeedBy(category: string) {
    await this.filterBtns.filter({ hasText: category }).click();
  }

  async openFeedArticle(index = 0) {
    await this.feedCards.nth(index).click();
  }

  async subscribe(email: string) {
    await this.newsletterEmail.fill(email);
    await this.newsletterForm.evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
  }
}
