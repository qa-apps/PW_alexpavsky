import { Page, Locator } from '@playwright/test';
import { CommonPage } from './CommonPage';

export class HomePage extends CommonPage {
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
  readonly articleModalHeading: Locator;
  readonly articleModalLinks: Locator;
  readonly articleModalContent: Locator;
  readonly ytSection: Locator;
  readonly ytCards: Locator;
  readonly principlesSection: Locator;
  readonly principleCards: Locator;
  readonly firstPrincipleCardHeading: Locator;
  readonly firstPrincipleCardDescription: Locator;
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
  readonly youtubeOutboundCards: Locator;
  readonly youtubeRealCards: Locator;
  readonly youtubeModalOverlay: Locator;
  readonly heroHeadline: Locator;
  readonly heroSubtitle: Locator;
  readonly newsletterError: Locator;
  readonly newsletterSuccess: Locator;
  readonly footerSection: Locator;
  readonly contactSection: Locator;
  readonly rulesOfThumbSection: Locator;
  readonly mediaDetailLinks: Locator;

  constructor(page: Page) {
    super(page);
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
    this.articleModal = page.locator('#article-modal-overlay, .article-modal').first();
    this.articleModalTitle = page.locator('#article-modal-title');
    this.articleModalLink = page.locator('#article-modal-link');
    this.articleModalClose = page.locator('#article-modal-close, .modal-close, .article-modal .close').first();
    this.articleModalHeading = page.locator('#article-modal-title, .article-modal h2, .article-modal h3').first();
    this.articleModalLinks = page.locator('#article-modal-link, .article-modal a');
    this.articleModalContent = page.locator('.article-modal, #article-modal-overlay').first();
    this.ytSection = page.locator('#yt-carousel, #videos').first();
    this.ytCards = page.locator('.yt-card');
    this.principlesSection = page.locator('#explore');
    this.principleCards = page.locator('#explore .explore-card');
    this.firstPrincipleCardHeading = this.principleCards.first().locator('h3');
    this.firstPrincipleCardDescription = this.principleCards.first().locator('p');
    this.toolsSection = page.locator('#tools');
    this.toolCards = page.locator('#tools .tool-card');
    this.labSection = page.locator('#lab');
    this.labCards = page.locator('#lab .lab-card');
    this.newsletterSection = page.locator('#digest');
    this.newsletterForm = page.locator('#newsletter-form');
    this.newsletterEmail = page.locator('#newsletter-email');
    this.mediaFeedSection = page.locator('#media-feed, #yt-carousel, #videos').first();
    this.videoThumbnails = page.locator('.video-thumbnail, .yt-card img, .yt-thumb');
    this.podcastCards = page.locator('.podcast-card, .yt-card');
    this.mediaTitles = page.locator('.media-title, .yt-title, .yt-card-title');
    this.youtubeCarousel = page.locator('#yt-carousel, #youtube-carousel').first();
    this.youtubeVideoCards = page.locator('.yt-card, .youtube-video-card');
    this.youtubeNextBtn = page.locator('#yt-btn-right, #carousel-next').first();
    this.youtubePrevBtn = page.locator('#yt-btn-left, #carousel-prev').first();
    this.youtubeVideoLinks = page.locator('.yt-card[href], .youtube-video-card a');
    this.youtubeOutboundCards = page.locator('.yt-card[href*="youtube.com"]');
    this.youtubeRealCards = page.locator('.yt-card[data-video-id]');
    this.youtubeModalOverlay = page.locator('#yt-modal-overlay.active');
    this.heroHeadline = page.locator('#hero-headline, #hero h1, .hero h1').first();
    this.heroSubtitle = page.locator('#hero-subtitle');
    this.newsletterError = page.locator('#newsletter-msg.error, #newsletter-error');
    this.newsletterSuccess = page.locator('#newsletter-msg.success, #newsletter-success');
    this.footerSection = page.locator('footer');
    this.contactSection = page.locator('#contact');
    this.rulesOfThumbSection = page.locator('#rules-of-thumb');
    this.mediaDetailLinks = page.locator('.media-title a, .video-thumbnail a, .yt-card[href]');
  }

  async filterMediaBy(label: string) {
    const filters = this.page.locator('.media-filter-btn').filter({ hasText: label });
    if (await filters.count()) {
      await filters.first().click();
    }
  }

  async goto() {
    await super.goto('/');
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async openMobileMenuIfNeeded() {
    if (await this.navMenuBtn.isVisible()) {
      await this.openMobileMenu();
    }
  }

  async filterFeedBy(category: string) {
    await this.filterBtns.filter({ hasText: category }).click();
  }

  async openFeedArticle(index = 0) {
    await this.feedCards.nth(index).click();
  }

  async closeArticleModal() {
    await this.articleModalClose.click();
  }

  async scrollArticleModal(top: number) {
    await this.articleModalContent.evaluate((el, scrollTop) => {
      el.scrollTop = scrollTop;
    }, top);
  }

  async getArticleModalScrollTop(): Promise<number> {
    return await this.articleModalContent.evaluate((el) => el.scrollTop);
  }

  async openFirstYoutubeVideoModal() {
    const card = this.youtubeRealCards.first();
    await card.evaluate((el) => (el as HTMLElement).click());
  }

  majorSections(): Locator[] {
    return [
      this.heroSection,
      this.liveFeedSection,
      this.principlesSection,
      this.toolsSection,
      this.labSection,
      this.newsletterSection,
    ];
  }

  async subscribe(email: string) {
    await this.newsletterEmail.fill(email);
    await this.newsletterForm.evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
  }
}
