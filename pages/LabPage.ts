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
  readonly principlesCategories: Locator;
  readonly principlesContent: Locator;
  readonly jsonDiffLeft: Locator;
  readonly jsonDiffRight: Locator;
  readonly jsonDiffCompareBtn: Locator;
  readonly jsonDiffResult: Locator;
  readonly jsonDiffError: Locator;
  readonly jsonDiffClearBtn: Locator;
  readonly breakAIScenarioCards: Locator;
  readonly breakAIInput: Locator;
  readonly breakAISubmitBtn: Locator;
  readonly breakAIResult: Locator;
  readonly breakAIDescription: Locator;
  readonly aiOrHumanSection: Locator;
  readonly aiOrHumanInput: Locator;
  readonly aiOrHumanAnalyzeBtn: Locator;
  readonly aiOrHumanResult: Locator;
  readonly aiOrHumanConfidence: Locator;
  readonly aiOrHumanError: Locator;
  readonly aiOrHumanClearBtn: Locator;
  readonly jsonDiffTool: Locator;
  readonly breakAISection: Locator;
  readonly closeBtn: Locator;
  readonly gptCards: Locator;
  readonly promptInjectionInput: Locator;
  readonly aiOrHumanTitle: Locator;

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
    this.principlesCategories = page.locator('.principles-category-btn');
    this.principlesContent = page.locator('.principles-content');
    this.jsonDiffLeft = page.locator('#json-diff-left');
    this.jsonDiffRight = page.locator('#json-diff-right');
    this.jsonDiffCompareBtn = page.locator('#json-diff-compare-btn');
    this.jsonDiffResult = page.locator('#json-diff-result');
    this.jsonDiffError = page.locator('#json-diff-error');
    this.jsonDiffClearBtn = page.locator('#json-diff-clear-btn');
    this.breakAIScenarioCards = page.locator('.break-ai-scenario-card');
    this.breakAIInput = page.locator('#break-ai-input');
    this.breakAISubmitBtn = page.locator('#break-ai-submit-btn');
    this.breakAIResult = page.locator('#break-ai-result');
    this.breakAIDescription = page.locator('#break-ai-description');
    this.aiOrHumanSection = page.locator('#ai-or-human');
    this.aiOrHumanInput = page.locator('#ai-or-human-input');
    this.aiOrHumanAnalyzeBtn = page.locator('#ai-or-human-analyze-btn');
    this.aiOrHumanResult = page.locator('#ai-or-human-result');
    this.aiOrHumanConfidence = page.locator('#ai-or-human-confidence');
    this.aiOrHumanError = page.locator('#ai-or-human-error');
    this.aiOrHumanClearBtn = page.locator('#ai-or-human-clear-btn');
    this.jsonDiffTool = page.locator('#json-diff-tool');
    this.breakAISection = page.locator('#break-ai-section');
    this.closeBtn = page.locator('#modal-close, .modal-close').first();
    this.gptCards = page.locator('#gpt-simulator .card, .gpt-card, [data-testid="gpt-card"]');
    this.promptInjectionInput = this.pitestInput;
    this.aiOrHumanTitle = page.locator('#ai-or-human-section h2, [data-testid="ai-or-human-title"]').first();
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

  async openPromptInjectionModal() {
    return this.openPromptInjectionScanner();
  }

  async openChallenge() {
    await this.openChallengeBtn.click();
  }


  async gotoPrinciples() {
    await this.page.goto('/labs/principles');
  }

  async gotoJSONDiff() {
    await this.page.goto('/labs/json-diff');
  }

  async gotoBreakAI() {
    await this.page.goto('/labs/break-ai');
  }

  async gotoAIOrHuman() {
    await this.page.goto('/labs/ai-or-human');
  }

  async gotoAICapabilities() {
    await this.page.goto('/labs/ai-capabilities');
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
