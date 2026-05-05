import { Page, Locator } from '@playwright/test';
import { CommonPage } from './CommonPage';

export class ChallengePage extends CommonPage {
  readonly openChallengeBtn: Locator;
  readonly categorySelector: Locator;
  readonly systemPromptDisplay: Locator;
  readonly systemPromptText: Locator;
  readonly promptInput: Locator;
  readonly submitBtn: Locator;
  readonly results: Locator;
  readonly botResponse: Locator;
  readonly verdictCard: Locator;
  readonly verdictTitle: Locator;
  readonly analysisText: Locator;
  readonly mitigationText: Locator;
  readonly judgeModel: Locator;
  readonly playgroundHeading: Locator;
  readonly playgroundInput: Locator;
  readonly playgroundSubmitBtn: Locator;
  readonly playgroundResult: Locator;
  readonly playgroundLabsLink: Locator;

  constructor(page: Page) {
    super(page);
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    this.categorySelector = page.locator('.challenge-cat-btn');
    this.systemPromptDisplay = page.locator('#challenge-system-prompt');
    this.systemPromptText = page.locator('#challenge-system-text');
    this.promptInput = page.locator('#challenge-input');
    this.submitBtn = page.locator('#challenge-submit-btn');
    this.results = page.locator('#challenge-results');
    this.botResponse = page.locator('#challenge-bot-response');
    this.verdictCard = page.locator('#challenge-verdict-card, .challenge-verdict-card');
    this.verdictTitle = page.locator('#verdict-title');
    this.analysisText = page.locator('#verdict-analysis');
    this.mitigationText = page.locator('#verdict-mitigation');
    this.judgeModel = page.locator('#verdict-judge-model');
    this.playgroundHeading = page.locator('h1').first();
    this.playgroundInput = page.locator('input, textarea').first();
    this.playgroundSubmitBtn = page.locator('button[type="submit"]').first();
    this.playgroundResult = page.locator('.result').first();
    this.playgroundLabsLink = page.locator('a[href="/labs"]').first();
  }

  async open() {
    await this.goto('/#lab');
    await this.openChallengeBtn.waitFor({ state: 'visible' });
    await this.openChallengeBtn.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
  }

  async selectCategory(categoryName: string) {
    await this.categorySelector.filter({ hasText: categoryName }).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
  }

  async submitAttack(prompt: string) {
    await this.promptInput.fill(prompt);
    await this.submitBtn.click();
  }

  async getVerdictAnalysis(): Promise<string | null> {
    return await this.analysisText.textContent();
  }

  async gotoPlayground() {
    await this.goto('/labs/challenge-playground');
  }

  async submitPlaygroundPrompt(prompt: string) {
    await this.playgroundInput.fill(prompt);
    await this.playgroundSubmitBtn.click();
  }
}
