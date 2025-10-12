import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly authBtn: Locator;
  readonly navLinks: Locator;
  readonly navMenuBtn: Locator;
  readonly mobileMenu: Locator;
  readonly heroSection: Locator;
  readonly heroTicker: Locator;
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
  readonly ytCarouselTrack: Locator;
  readonly ytArrowLeft: Locator;
  readonly ytArrowRight: Locator;
  readonly ytModal: Locator;
  readonly ytModalClose: Locator;
  readonly principlesSection: Locator;
  readonly principleCards: Locator;
  readonly toolsSection: Locator;
  readonly toolCards: Locator;
  readonly labSection: Locator;
  readonly labCards: Locator;
  readonly newsletterSection: Locator;
  readonly newsletterForm: Locator;
  readonly newsletterEmail: Locator;
  readonly newsletterBtn: Locator;
  readonly newsletterMsg: Locator;
  readonly chatWidget: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('#theme-toggle, [aria-label*="theme"], .theme-toggle').first();
    this.authBtn = page.locator('#auth-btn');
    this.navLinks = page.locator('nav .nav-link');
    this.navMenuBtn = page.locator('#nav-menu-btn');
    this.mobileMenu = page.locator('#mobile-menu');
    this.heroSection = page.locator('#hero, .hero').first();
    this.heroTicker = page.locator('.ticker-bar, #ticker-track').first();
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
    this.ytCarouselTrack = page.locator('#yt-carousel-track');
    this.ytArrowLeft = page.locator('#yt-arrow-left');
    this.ytArrowRight = page.locator('#yt-arrow-right');
    this.ytModal = page.locator('#yt-modal-overlay');
    this.ytModalClose = page.locator('#yt-modal-close');
    this.principlesSection = page.locator('#explore');
    this.principleCards = page.locator('#explore .explore-card');
    this.toolsSection = page.locator('#tools');
    this.toolCards = page.locator('#tools .tool-card');
    this.labSection = page.locator('#lab');
    this.labCards = page.locator('#lab .lab-card');
    this.newsletterSection = page.locator('#digest');
    this.newsletterForm = page.locator('#newsletter-form');
    this.newsletterEmail = page.locator('#newsletter-email');
    this.newsletterBtn = page.locator('#newsletter-btn');
    this.newsletterMsg = page.locator('#newsletter-msg');
    this.chatWidget = page.locator('#chat-widget');
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
