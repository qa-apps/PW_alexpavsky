import { Page, Locator } from '@playwright/test';
import { CommonPage } from './CommonPage';

export class LabPage extends CommonPage {
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
  readonly attackgenIndustry: Locator;
  readonly attackgenTarget: Locator;
  readonly attackgenRunBtn: Locator;
  readonly chatWindow: Locator;
  readonly principleTitles: Locator;
  readonly labsBackLink: Locator;

  constructor(page: Page) {
    super(page);
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
    this.modalCloseBtns = page.locator('.json-modal.active .modal-close, .diff-modal.active .modal-close, .modal-close, #chat-close');
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
    this.gptCards = page.locator('#lab .lab-card, #gpt-simulator .card, .gpt-card, [data-testid="gpt-card"]');
    this.promptInjectionInput = this.pitestInput;
    this.aiOrHumanTitle = page.locator('#ai-or-human-section h2, [data-testid="ai-or-human-title"]').first();
    this.attackgenIndustry = page.locator('#attackgen-industry');
    this.attackgenTarget = page.locator('#attackgen-target');
    this.attackgenRunBtn = page.locator('#attackgen-run-btn');
    this.chatWindow = page.locator('#chat-window');
    this.principleTitles = page.locator('.principle-title');
    this.labsBackLink = page.locator('a[href="/labs"]').first();
  }

  async goto() {
    await super.goto('/#lab');
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

  async openChat() {
    await this.openChatBtn.click();
  }

  async gotoPrinciples() {
    await super.goto('/labs/principles');
  }

  async gotoJSONDiff() {
    await super.goto('/labs/json-diff');
  }

  async gotoBreakAI() {
    await super.goto('/labs/break-ai');
  }

  async gotoAIOrHuman() {
    await super.goto('/labs/ai-or-human');
  }

  async gotoAICapabilities() {
    await super.goto('/labs/ai-capabilities');
  }

  async selectBreakAIScenario(index = 0) {
    await this.breakAIScenarioCards.nth(index).click();
  }

  async submitBreakAI(text: string) {
    await this.breakAIInput.fill(text);
    await this.breakAISubmitBtn.click();
  }

  async analyzeAIOrHuman(text?: string) {
    if (text !== undefined) {
      await this.aiOrHumanInput.fill(text);
    }
    await this.aiOrHumanAnalyzeBtn.click();
  }

  async navigateBackToLabs() {
    await this.labsBackLink.click();
  }

  async closeTopModal() {
    await this.page.keyboard.press('Escape');
    const activeModal = this.page.locator('.json-modal.active, .diff-modal.active').last();
    const activeModalCount = await activeModal.count();
    if (activeModalCount === 0) return;

    const activeCloseBtn = activeModal.locator('.modal-close, [aria-label="Close"]').first();
    if (await activeCloseBtn.count()) {
      await activeCloseBtn.click({ force: true });
      return;
    }

    const count = await this.modalCloseBtns.count();
    for (let i = 0; i < count; i += 1) {
      const button = this.modalCloseBtns.nth(i);
      if (await button.isVisible()) {
        await button.click({ force: true });
        return;
      }
    }
  }
}
