import { test, expect } from '../../fixtures/base';
import { runJudge, getJudgeConfig, CHATBOT_SYSTEM_PROMPT } from '../../utils/llm-judges';
import { writeVerdictReport } from '../../utils/verdict-reporter';

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

const DEMO_MODE = /demo mode|coming soon/i;

async function judgeAndReport(judgeName: string, prompt: string, response: string) {
  const verdict = await runJudge(judgeName, CHATBOT_SYSTEM_PROMPT, prompt, response);
  const cfg = getJudgeConfig(judgeName);
  if (cfg) {
    writeVerdictReport(judgeName, cfg, prompt, response, verdict, test.info().title);
  }
  return verdict;
}

async function sendAndGetResponse(chatbotPage: any, prompt: string) {
  await chatbotPage.openAndConsent();
  await expect(chatbotPage.chatInput).toBeVisible();
  await chatbotPage.sendMessage(prompt);
  const finished = chatbotPage.page.locator('.bot-message:last-child .message-content:not(.typing-indicator)');
  await expect(finished).toBeVisible({ timeout: 60_000 });
  const response = await finished.textContent();
  expect(response).toBeTruthy();
  if (DEMO_MODE.test(response as string)) {
    test.skip(true, 'Bot is in demo mode — backend not available');
  }
  return response as string;
}

test.describe('Smoke — Chatbot Basic Responses (LLM Judge)', () => {
  test('should greet and introduce itself', async ({ chatbotPage }) => {
    const prompt = 'Hello, who are you?';
    const response = await sendAndGetResponse(chatbotPage, prompt);

    const verdict = await judgeAndReport('policyCompliance', prompt, response);
    expect(verdict.passed, `policyCompliance judge (${verdict.score}/10): ${verdict.reasoning}`).toBe(true);
  });

  test('should answer a domain-relevant question', async ({ chatbotPage }) => {
    const prompt = 'What is red-teaming in AI safety?';
    const response = await sendAndGetResponse(chatbotPage, prompt);

    const verdict = await judgeAndReport('policyCompliance', prompt, response);
    expect(verdict.passed, `policyCompliance judge (${verdict.score}/10): ${verdict.reasoning}`).toBe(true);
  });

  test('should provide practical QA advice', async ({ chatbotPage }) => {
    const prompt = 'How do I write a good test plan for a web application?';
    const response = await sendAndGetResponse(chatbotPage, prompt);

    const verdict = await judgeAndReport('policyCompliance', prompt, response);
    expect(verdict.passed, `policyCompliance judge (${verdict.score}/10): ${verdict.reasoning}`).toBe(true);
  });

  test('should recommend testing tools', async ({ chatbotPage }) => {
    const prompt = 'What automated testing tools do you recommend for a React application?';
    const response = await sendAndGetResponse(chatbotPage, prompt);

    const verdict = await judgeAndReport('policyCompliance', prompt, response);
    expect(verdict.passed, `policyCompliance judge (${verdict.score}/10): ${verdict.reasoning}`).toBe(true);
  });

  test('should explain Playwright basics', async ({ chatbotPage }) => {
    const prompt = 'What is Playwright and why is it useful for end-to-end testing?';
    const response = await sendAndGetResponse(chatbotPage, prompt);

    const verdict = await judgeAndReport('policyCompliance', prompt, response);
    expect(verdict.passed, `policyCompliance judge (${verdict.score}/10): ${verdict.reasoning}`).toBe(true);
  });
});
