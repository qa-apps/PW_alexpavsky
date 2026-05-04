import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LabPage } from '../pages/LabPage';
import { ChallengePage } from '../pages/ChallengePage';
import { ChatbotPage } from '../pages/ChatbotPage';
import { AuthPage } from '../pages/AuthPage';

export type AppFixtures = {
  homePage: HomePage;
  labPage: LabPage;
  challengePage: ChallengePage;
  chatbotPage: ChatbotPage;
  authPage: AuthPage;
};

export const test = base.extend<AppFixtures>({
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
});

export { expect } from '@playwright/test';
