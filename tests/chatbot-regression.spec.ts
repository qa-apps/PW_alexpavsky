import { Page, Route } from '@playwright/test';
import { test, expect } from '../utils/fixtures';
import { ChatbotPage } from '../pages/ChatbotPage';

async function mockChatReply(page: Page, reply: string, extra: Record<string, unknown> = {}) {
  await page.route('**/api/chat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply, ...extra }),
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

  test('should not expose raw image tool-call JSON in chat replies', async ({ chatbotPage, page }) => {
    await mockChatReply(
      page,
      JSON.stringify({
        action: 'dalle.text2im',
        action_input: '{"prompt":"A serene lake"}',
        thought: 'I will generate a serene image of a lake for you.',
      })
    );

    const lastBotMessage = await sendPromptAndGetLastBotMessage(chatbotPage, 'generate image of lake');
    const renderedText = (await lastBotMessage.textContent()) || '';

    expect(renderedText).not.toContain('dalle.text2im');
    expect(renderedText).not.toContain('action_input');
    expect(renderedText).not.toContain('"thought"');
    expect(renderedText).toMatch(/tool-call JSON|image-generation endpoint|картин/i);
  });

  test('should render generated images returned by the chatbot API', async ({ chatbotPage, page }) => {
    const onePixelPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    await mockChatReply(page, 'Generated image:', {
      images: [
        {
          data_url: `data:image/png;base64,${onePixelPng}`,
          alt: 'Generated lake image',
        },
      ],
    });

    const lastBotMessage = await sendPromptAndGetLastBotMessage(chatbotPage, 'generate image of lake');
    await expect(lastBotMessage.locator('.chat-generated-image img[alt="Generated lake image"]')).toBeVisible();
  });
});
