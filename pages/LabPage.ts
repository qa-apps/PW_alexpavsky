import { Page, Locator } from '@playwright/test';

export class LabPage {
  readonly page: Page;
  readonly openChatBtn: Locator;
  readonly openAttackGenBtn: Locator;
  readonly openHallucinationBtn: Locator;
  readonly openPitestBtn: Locator;
  readonly openChallengeBtn: Locator;
  readonly attackgenModal: Locator;
  readonly hallucinationModal: Locator;
  readonly pitestModal: Locator;
  readonly pitestInput: Locator;
  readonly pitestScanBtn: Locator;
  readonly pitestOutput: Locator;
  readonly challengeModal: Locator;
  readonly modalCloseBtns: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openChatBtn = page.locator('#open-chat-btn');
    this.openAttackGenBtn = page.locator('#open-attackgen-btn');
    this.openHallucinationBtn = page.locator('#open-hallucination-btn');
    this.openPitestBtn = page.locator('#open-pitest-btn');
    this.openChallengeBtn = page.locator('#open-challenge-btn');
    this.attackgenModal = page.locator('#attackgen-modal');
    this.hallucinationModal = page.locator('#hallucination-modal');
    this.pitestModal = page.locator('#pitest-modal');
    this.pitestInput = page.locator('#pitest-input');
    this.pitestScanBtn = page.locator('#pitest-scan-btn');
    this.pitestOutput = page.locator('#pitest-output');
    this.challengeModal = page.locator('#challenge-modal');
    this.modalCloseBtns = page.locator('.modal-close, #chat-close');
  }

  async goto() {
    await this.page.goto('/#lab', { waitUntil: 'domcontentloaded' });
    await this.openAttackGenBtn.waitFor({ state: 'visible' });
  }

  async openAttackGenerator() {
    await this.openAttackGenBtn.click();
  }

  async openHallucinationAnalyzer() {
    await this.openHallucinationBtn.click();
  }

  async openPromptInjectionScanner() {
    await this.openPitestBtn.click();
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
