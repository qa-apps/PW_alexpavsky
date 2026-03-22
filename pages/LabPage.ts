import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model representing the AI & QA Lab dashboard section.
 */
export class LabPage {
  readonly page: Page;
  
  // AI Lab Triggers
  readonly openChatBtn: Locator;
  readonly openJsonBtn: Locator;
  readonly openDiffBtn: Locator;
  readonly openChallengeBtn: Locator;

  // Generic tools modals
  readonly modalCloseBtn: Locator;

  /**
   * Initializes Locators for tools available in the Lab section.
   * @param page - Playwright Page object
   */
  constructor(page: Page) {
    this.page = page;
    
    this.openChatBtn = page.locator('#open-chat-btn');
    this.openJsonBtn = page.locator('#open-json-btn');
    this.openDiffBtn = page.locator('#open-diff-btn');
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    
    this.modalCloseBtn = page.locator('.modal-close');
  }

  /**
   * Navigates directly to the Lab anchor on the page.
   */
  async goto() {
    await this.page.goto('/#lab');
  }

  /**
   * Clicks the JSON formatter tool to open its dedicated view/modal.
   */
  async openJsonFormatter() {
    await this.openJsonBtn.click();
  }

  /**
   * Clicks the Diff Checker tool to initialize its side-by-side view.
   */
  async openDiffChecker() {
    await this.openDiffBtn.click();
  }
}
