import { Page, Route } from '@playwright/test';
import { test, expect } from '../utils/fixtures';
import { ChatbotPage } from '../pages/ChatbotPage';

async function mockChatReply(page: Page, reply: string) {
  await page.route('**/api/chat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply }),
    });
  });
}

async function sendPromptAndGetLastBotMessage(chatbotPage: ChatbotPage, prompt: string) {
  await chatbotPage.openAndConsent();
  await chatbotPage.sendMessage(prompt);
  const message = chatbotPage.page.locator('.bot-message').last();
  await expect(message.locator('.message-content, .message-text').first()).toBeVisible();
  return message;
}

test.describe('AI assistant widget regressions', () => {
  test('should render markdown emphasis and headings instead of raw markdown tokens', async ({ chatbotPage, page }) => {
    await mockChatReply(
      page,
      [
        "### 1. **Learn Foundational Concepts**",
        "- **Machine Learning Basics**: Study supervised learning.",
        "- **Data Science**: Understand preprocessing and visualization.",
      ].join('\n')
    );

    const lastBotMessage = await sendPromptAndGetLastBotMessage(chatbotPage, 'How do I start learning AI?');
    const renderedText = (await lastBotMessage.textContent()) || '';

    expect(renderedText).toContain('Learn Foundational Concepts');
    expect(renderedText).not.toContain('### 1. **Learn Foundational Concepts**');
    expect(renderedText).not.toContain('**Machine Learning Basics**');
    expect(await lastBotMessage.locator('strong, b, h1, h2, h3').count()).toBeGreaterThan(0);
  });

  test('should render numbered and bulleted markdown content as structured list items', async ({ chatbotPage, page }) => {
    await mockChatReply(
      page,
      [
        'AI issues can be broadly categorized into several key areas:',
        '',
        '1. **Bias and Fairness:** AI models can inherit bias from training data.',
        '2. **Accuracy and Robustness:** Models may fail on adversarial inputs.',
        '3. **Explainability:** Advanced models can be hard to interpret.',
        '4. **Privacy Concerns:** AI systems often require large volumes of data.',
      ].join('\n')
    );

    const lastBotMessage = await sendPromptAndGetLastBotMessage(chatbotPage, 'What are the main AI issues?');
    const renderedText = (await lastBotMessage.textContent()) || '';

    expect(renderedText).toContain('Bias and Fairness');
    expect(renderedText).not.toContain('1. **Bias and Fairness:**');
    expect(renderedText).not.toContain('2. **Accuracy and Robustness:**');
    expect(await lastBotMessage.locator('ol li, ul li, li').count()).toBeGreaterThanOrEqual(4);
  });
});
