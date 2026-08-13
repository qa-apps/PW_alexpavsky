import { Page, Route } from '@playwright/test';
import { test, expect } from '../../utils/fixtures';
import { ChatbotPage } from '../../pages/ChatbotPage';

async function mockChatReply(page: Page, reply: string) {
  await page.route('**/api/chat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply }),
    });
  });
}

async function mockChatPayload(page: Page, payload: Record<string, unknown>) {
  await page.route('**/api/chat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
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

test.describe('AI assistant widget regressions', {
  tag: ['@regression', '@pure'],
}, () => {
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

  test('should render generated images when assistant images[] contains plain string entries', async ({ chatbotPage, page }) => {
    await mockChatPayload(page, {
      reply: 'Here is your generated image.',
      images: [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oNcamcAAAAASUVORK5CYII=',
      ],
    });

    const lastBotMessage = await sendPromptAndGetLastBotMessage(chatbotPage, 'generate image of lake');
    const renderedImage = lastBotMessage.locator('.chat-generated-image img');

    await expect(renderedImage).toHaveCount(1);
    await expect(renderedImage.first()).toHaveAttribute('src', /^data:image\/png;base64,/);
  });
});

// Hits production /api/chat (real LLM) — non-blocking @upstream lane.
test.describe('AI assistant response hygiene (real backend, no mocking)', {
  tag: ['@regression', '@upstream'],
}, () => {
  // Model routing is automatic and can pick a reasoning model (DeepSeek R1, etc.)
  // for any of these. Reasoning models sometimes emit their chain-of-thought as
  // literal <think>...</think> text instead of a separate reasoning field — that
  // must never reach the visible chat response. Several prompts run for better
  // odds of exercising a reasoning-tagged model within a single run.
  const prompts = [
    "What is today's date?",
    'Explain step by step how you would debug a flaky test.',
    'What is 17 * 24? Show your reasoning.',
  ];

  for (const prompt of prompts) {
    test(`should not leak <think> reasoning tags for prompt: "${prompt}"`, async ({ chatbotPage }) => {
      const response = await chatbotPage.sendAndGetResponse(prompt);
      const lower = response.toLowerCase();
      expect(lower, `Response leaked raw reasoning markup: ${response}`).not.toContain('<think>');
      expect(lower, `Response leaked raw reasoning markup: ${response}`).not.toContain('</think>');
    });
  }
});
