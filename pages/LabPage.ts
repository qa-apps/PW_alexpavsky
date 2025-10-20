import { Page, Locator } from '@playwright/test';

export class LabPage {
  readonly page: Page;
  readonly openChatBtn: Locator;
  readonly openJsonBtn: Locator;
  readonly openDiffBtn: Locator;
  readonly openAiVsHumanBtn: Locator;
  readonly openChallengeBtn: Locator;
  readonly jsonModal: Locator;
  readonly jsonInput: Locator;
  readonly jsonFormatBtn: Locator;
  readonly jsonOutput: Locator;
  readonly diffModal: Locator;
  readonly diffLeft: Locator;
  readonly diffRight: Locator;
  readonly diffCompareBtn: Locator;
  readonly diffOutput: Locator;
  readonly aiVsHumanModal: Locator;
  readonly aiVsHumanChoices: Locator;
  readonly aiVsHumanRound: Locator;
  readonly aiVsHumanScore: Locator;
  readonly aiVsHumanFeedback: Locator;
  readonly aiVsHumanExplanation: Locator;
  readonly aiVsHumanNextBtn: Locator;
  readonly challengePanel: Locator;
  readonly modalCloseBtns: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openChatBtn = page.locator('#open-chat-btn');
    this.openJsonBtn = page.locator('#open-json-btn');
    this.openDiffBtn = page.locator('#open-diff-btn');
    this.openAiVsHumanBtn = page.locator('#open-aivshu-btn');
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    this.jsonModal = page.locator('#json-modal');
    this.jsonInput = page.locator('#json-input');
    this.jsonFormatBtn = page.locator('#json-format-btn');
    this.jsonOutput = page.locator('#json-output');
    this.diffModal = page.locator('#diff-modal');
    this.diffLeft = page.locator('#diff-left');
    this.diffRight = page.locator('#diff-right');
    this.diffCompareBtn = page.locator('#diff-compare-btn');
    this.diffOutput = page.locator('#diff-output');
    this.aiVsHumanModal = page.locator('#aivshu-modal');
    this.aiVsHumanChoices = page.locator('#aivshu-buttons button');
    this.aiVsHumanRound = page.locator('#aivshu-round');
    this.aiVsHumanScore = page.locator('#aivshu-score');
    this.aiVsHumanFeedback = page.locator('#aivshu-feedback-text');
    this.aiVsHumanExplanation = page.locator('#aivshu-explanation');
    this.aiVsHumanNextBtn = page.locator('#aivshu-next-btn');
    this.challengePanel = page.locator('#challenge-playground');
    this.modalCloseBtns = page.locator('.modal-close, #chat-close');
  }

  async goto() {
    await this.page.goto('/#lab', { waitUntil: 'domcontentloaded' });
    await this.openJsonBtn.waitFor({ state: 'visible' });
  }

  async openJsonFormatter() {
    await this.openJsonBtn.click();
  }

  async openDiffChecker() {
    await this.openDiffBtn.click();
  }

  async openAiVsHuman() {
    await this.openAiVsHumanBtn.click();
  }

  async openChallenge() {
    await this.openChallengeBtn.click();
  }

  async closeTopModal() {
    const count = await this.modalCloseBtns.count();
    for (let i = 0; i < count; i += 1) {
      const button = this.modalCloseBtns.nth(i);
      if (await button.isVisible()) {
        await button.click();
        return;
      }
    }
  }
}
