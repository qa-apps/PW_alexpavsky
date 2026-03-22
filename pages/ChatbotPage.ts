import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for interacting directly with the AI Chatbot interface.
 */
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

  /**
   * Initializes all required Locators for the chatbot window, inputs, and toggles.
   * @param page - Playwright Page object
   */
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

  /**
   * Navigates to the site, opens the chatbot, and accepts the consent form if presented.
   */
  async openAndConsent() {
    await this.page.goto('/');
    await this.toggleBtn.click();
    
    if (await this.consentCheckbox.isVisible()) {
      await this.consentCheckbox.check();
      await this.consentAgreeBtn.click();
    }
  }

  /**
   * Sends a string message to the chatbot.
   * @param text - The content of the message
   */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendBtn.click();
  }

  /**
   * Extracts the text content of the most recent AI response bubble.
   * @returns {Promise<string | null>} The text content, or null if no AI messages exist.
   */
  async getLastAiResponse(): Promise<string | null> {
    const aiMsgs = await this.aiMessages.all();
    if (aiMsgs.length === 0) return null;
    return await aiMsgs[aiMsgs.length - 1].textContent();
  }

  /**
   * Resets the active chat session, clearing context.
   */
  async resetChat() {
    await this.resetBtn.click();
  }
}
