import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the main Alex Pavsky Home Page.
 */
export class HomePage {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly authBtn: Locator;
  readonly feedLinks: Locator;
  
  // Hero & General
  readonly heroSection: Locator;
  
  // Live Feed
  readonly liveFeedSection: Locator;
  readonly feedCards: Locator;
  readonly loadMoreBtn: Locator;
  readonly filterBtns: Locator;
  
  // YouTube Feed
  readonly ytSectionTitle: Locator;
  readonly ytCards: Locator;

  // QA & Safe AI
  readonly principleCards: Locator;
  readonly toolCards: Locator;

  /**
   * Initializes Locators for the HomePage elements.
   * @param page - Playwright Page object instance
   */
  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('#theme-toggle');
    this.authBtn = page.locator('#auth-btn');
    this.feedLinks = page.locator('.nav-link');
    
    this.heroSection = page.locator('.hero-section');
    this.liveFeedSection = page.locator('h2:has-text("Live Feed")').locator('xpath=..');
    this.feedCards = page.locator('.feed-card');
    this.loadMoreBtn = page.locator('.load-more-btn');
    this.filterBtns = page.locator('.filter-btn');
    
    this.ytSectionTitle = page.locator('h2:has-text("Trending AI & Tech Videos")');
    this.ytCards = page.locator('.yt-card');

    this.principleCards = page.locator('.principle-card');
    this.toolCards = page.locator('.tool-card');
  }

  /**
   * Navigates to the base URL of the application.
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Toggles the UI theme between dark and light modes.
   */
  async toggleTheme() {
    await this.themeToggle.click();
  }

  /**
   * Checks if the "Load More" button is visible and clicks it to expand the feed.
   */
  async loadMoreFeeds() {
    if (await this.loadMoreBtn.isVisible()) {
      await this.loadMoreBtn.click();
    }
  }

  /**
   * Filters the live feed by selecting a specific category pill.
   * @param category - Name of the category to filter by (e.g. "AI & LLM")
   */
  async filterFeedBy(category: string) {
    await this.filterBtns.filter({ hasText: category }).click();
  }
}
