import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the "Can you break this AI?" interactive challenge suite.
 */
export class ChallengePage {
  readonly page: Page;
  readonly openChallengeBtn: Locator;
  readonly categorySelector: Locator;
  readonly systemPromptDisplay: Locator;
  readonly promptInput: Locator;
  readonly submitBtn: Locator;
  readonly botResponse: Locator;
  readonly verdictPass: Locator;
  readonly verdictFail: Locator;
  readonly analysisText: Locator;

  /**
   * Initializes standard Locators for the vulnerability challenge modal/view.
   * @param page - Playwright Page object
   */
  constructor(page: Page) {
    this.page = page;
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    this.categorySelector = page.locator('.challenge-cat-btn');
    this.systemPromptDisplay = page.locator('.challenge-system-prompt');
    this.promptInput = page.locator('#challenge-input');
    this.submitBtn = page.locator('#challenge-submit-btn');
    this.botResponse = page.locator('#challenge-bot-response');
    this.verdictPass = page.locator('.verdict-pass');
    this.verdictFail = page.locator('.verdict-fail');
    this.analysisText = page.locator('.challenge-analysis');
  }

  /**
   * Navigates to the Lab and opens the Challenge interface.
   */
  async open() {
    await this.page.goto('/#lab');
    await this.openChallengeBtn.click();
  }

  /**
   * Selects a specific challenge category (e.g. Prompt Injection, Jailbreak).
   * @param categoryName - The visible text of the category button
   */
  async selectCategory(categoryName: string) {
    await this.categorySelector.filter({ hasText: categoryName }).click();
  }

  /**
   * Fills the prompt input with a malicious string and submits the attack.
   * @param prompt - The adversarial input string
   */
  async submitAttack(prompt: string) {
    await this.promptInput.fill(prompt);
    await this.submitBtn.click();
  }

  /**
   * Retrieves the reasoning/analysis text returned after an attack evaluation.
   * @returns {Promise<string | null>} The text content of the analysis block.
   */
  async getVerdictAnalysis(): Promise<string | null> {
    return await this.analysisText.textContent();
  }
}
