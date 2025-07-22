import { Page, Locator } from '@playwright/test';

export class ChallengePage {
  readonly page: Page;
  
  readonly openChallengeBtn: Locator;
  
  // Challenge Modal
  readonly categorySelector: Locator;
  readonly systemPromptDisplay: Locator;
  readonly promptInput: Locator;
  readonly submitBtn: Locator;
  
  // Results
  readonly botResponse: Locator;
  readonly verdictPass: Locator;
  readonly verdictFail: Locator;
  readonly analysisText: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    
    // Abstracting common selectors for the modal
    this.categorySelector = page.locator('.challenge-category-btn');
    this.systemPromptDisplay = page.locator('.challenge-system-prompt');
    this.promptInput = page.locator('#challenge-input');
    this.submitBtn = page.locator('#challenge-submit');
    
    this.botResponse = page.locator('.challenge-bot-response');
    this.verdictPass = page.locator('.verdict-pass');
    this.verdictFail = page.locator('.verdict-fail');
    this.analysisText = page.locator('.challenge-analysis');
  }

  async open() {
    await this.page.goto('/#lab');
    await this.openChallengeBtn.click();
  }

  async selectCategory(categoryName: string) {
    await this.categorySelector.filter({ hasText: categoryName }).click();
  }

  async submitAttack(prompt: string) {
    await this.promptInput.fill(prompt);
    await this.submitBtn.click();
  }

  async getVerdictAnalysis() {
    return await this.analysisText.textContent();
  }
}
