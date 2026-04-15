import { Page, Locator } from '@playwright/test';
import { CommonPage } from './CommonPage';

export class ChatbotPage extends CommonPage {
  readonly toggleBtn: Locator;
  readonly window: Locator;
  readonly consentPanel: Locator;
  readonly consentCheckbox: Locator;
  readonly consentAgreeBtn: Locator;
  readonly termsLink: Locator;
  readonly termsPanel: Locator;
  readonly termsBackBtn: Locator;
  readonly chatForm: Locator;
  readonly chatInput: Locator;
  readonly aiMessages: Locator;
  readonly userMessages: Locator;
  readonly resetBtn: Locator;
  readonly closeBtn: Locator;
  readonly finishedAiMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.toggleBtn = page.locator('#chat-toggle');
    this.window = page.locator('#chat-window');
    this.consentPanel = page.locator('#chat-consent');
    this.consentCheckbox = page.locator('#chat-consent-cb');
    this.consentAgreeBtn = page.locator('#chat-consent-btn, button:has-text("Agree & Start Chat")');
    this.termsLink = page.locator('#chat-terms-link');
    this.termsPanel = page.locator('#chat-terms-panel');
    this.termsBackBtn = page.locator('#chat-terms-back');
    this.chatForm = page.locator('#chat-form');
    this.chatInput = page.locator('#chat-input');
    this.aiMessages = page.locator('.bot-message .message-content, .bot-message .message-text');
    this.userMessages = page.locator('.user-message');
    this.resetBtn = page.locator('#chat-reset');
    this.closeBtn = page.locator('#chat-close, .chatbot-close-btn, [data-testid="chatbot-close-btn"]').first();
    this.finishedAiMessage = page.locator('.bot-message:last-child .message-content:not(.typing-indicator)');
  }

  async openAndConsent() {
    await this.goto('/');
    await this.open();
    await this.acceptConsentIfNeeded();
  }

  async open() {
    if (!(await this.toggleBtn.isVisible())) {
      await this.goto('/');
    }
    await this.toggleBtn.click();
    await this.window.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async acceptConsentIfNeeded() {
    if (await this.consentCheckbox.isVisible()) {
      await this.consentCheckbox.evaluate((element) => {
        const input = element as HTMLInputElement;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await this.consentAgreeBtn.click({ force: true });
    }
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatForm.evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
  }

  async sendAndGetResponse(text: string): Promise<string> {
    await this.openAndConsent();
    await this.sendMessage(text);
    await this.finishedAiMessage.waitFor({ state: 'visible', timeout: 60_000 });
    return (await this.finishedAiMessage.textContent()) || '';
  }

  async getLastAiResponse(): Promise<string | null> {
    await this.aiMessages.last().waitFor({ state: 'visible', timeout: 15_000 });
    const aiMsgs = await this.aiMessages.all();
    if (aiMsgs.length === 0) return null;
    return await aiMsgs[aiMsgs.length - 1].textContent();
  }

  async resetChat() {
    await this.resetBtn.click();
  }

  async close() {
    await this.closeBtn.click({ force: true });
  }
}
