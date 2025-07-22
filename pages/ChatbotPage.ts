import { Page, Locator } from '@playwright/test';

export class ChatbotPage {
  readonly page: Page;
  
  readonly toggleBtn: Locator;
  readonly consentCheckbox: Locator;
  readonly consentAgreeBtn: Locator;
  
  readonly chatInput: Locator;
  readonly sendBtn: Locator;
  readonly attachBtn: Locator;
  readonly messages: Locator;
  readonly aiMessages: Locator;
  readonly userMessages: Locator;

  readonly resetBtn: Locator;
  readonly closeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.toggleBtn = page.locator('#chat-toggle');
    this.consentCheckbox = page.locator('#chat-consent-cb');
    this.consentAgreeBtn = page.locator('#chat-consent-btn, button:has-text("Agree & Start Chat")');
    
    this.chatInput = page.locator('#chat-input');
    this.sendBtn = page.locator('.chat-send-btn');
    this.attachBtn = page.locator('#chat-attach-btn');
    
    this.messages = page.locator('.chat-message');
    this.aiMessages = page.locator('.chat-message-ai');
    this.userMessages = page.locator('.chat-message-user');

    this.resetBtn = page.locator('#chat-reset');
    this.closeBtn = page.locator('#chat-close');
  }

  async openAndConsent() {
    await this.page.goto('/');
    await this.toggleBtn.click();
    
    // Handle consent if it's visible
    if (await this.consentCheckbox.isVisible()) {
      await this.consentCheckbox.check();
      await this.consentAgreeBtn.click();
    }
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendBtn.click();
  }

  async getLastAiResponse(): Promise<string | null> {
    const aiMsgs = await this.aiMessages.all();
    if (aiMsgs.length === 0) return null;
    return await aiMsgs[aiMsgs.length - 1].textContent();
  }

  async resetChat() {
    await this.resetBtn.click();
  }
}
