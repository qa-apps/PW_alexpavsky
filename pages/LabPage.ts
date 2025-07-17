import { Page, Locator } from '@playwright/test';

export class LabPage {
  readonly page: Page;
  
  // AI Lab Triggers
  readonly openChatBtn: Locator;
  readonly openJsonBtn: Locator;
  readonly openDiffBtn: Locator;
  readonly openChallengeBtn: Locator;

  // Generic tools modals (if they open within the page)
  readonly modalCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.openChatBtn = page.locator('#open-chat-btn');
    this.openJsonBtn = page.locator('#open-json-btn');
    this.openDiffBtn = page.locator('#open-diff-btn');
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    
    this.modalCloseBtn = page.locator('.modal-close');
  }

  async goto() {
    await this.page.goto('/#lab');
  }

  async openJsonFormatter() {
    await this.openJsonBtn.click();
  }

  async openDiffChecker() {
    await this.openDiffBtn.click();
  }
}
