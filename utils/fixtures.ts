import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LabPage } from '../pages/LabPage';
import { ChallengePage } from '../pages/ChallengePage';
import { ChatbotPage } from '../pages/ChatbotPage';
import { AuthPage } from '../pages/AuthPage';
import { CommonPage } from '../pages/CommonPage';
import { LiveRailPage } from '../pages/LiveRailPage';

export type AppFixtures = {
  qaChatBypass: void;
  commonPage: CommonPage;
  homePage: HomePage;
  labPage: LabPage;
  challengePage: ChallengePage;
  chatbotPage: ChatbotPage;
  authPage: AuthPage;
  liveRailPage: LiveRailPage;
};

export const test = base.extend<AppFixtures>({
  qaChatBypass: [async ({ page }, use) => {
    const token = process.env.QA_BYPASS_TOKEN?.trim();
    if (token) {
      await page.route('**/api/chat', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/chat' && /^(?:www\.)?alexpavsky\.com$/i.test(url.hostname)) {
          await route.continue({
            headers: {
              ...route.request().headers(),
              'x-qa-token': token,
            },
          });
          return;
        }
        await route.continue();
      });
    }
    await use();
  }, { auto: true }],
  commonPage: async ({ page }, use) => {
    const commonPage = new CommonPage(page);
    await use(commonPage);
  },
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
  labPage: async ({ page }, use) => {
    const labPage = new LabPage(page);
    await use(labPage);
  },
  challengePage: async ({ page }, use) => {
    const challengePage = new ChallengePage(page);
    await use(challengePage);
  },
  chatbotPage: async ({ page }, use) => {
    const chatbotPage = new ChatbotPage(page);
    await use(chatbotPage);
  },
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },
  liveRailPage: async ({ page }, use) => {
    const liveRailPage = new LiveRailPage(page);
    await use(liveRailPage);
  },
});

export { expect } from '@playwright/test';
