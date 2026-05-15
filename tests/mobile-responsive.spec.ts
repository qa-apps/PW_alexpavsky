import { test, expect } from '../utils/fixtures';

const deviceProfiles = [
  {
    name: 'iPhone 15 Pro',
    kind: 'phone',
    use: {
      viewport: { width: 393, height: 852 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    },
  },
  {
    name: 'Samsung Galaxy S25',
    kind: 'phone',
    use: {
      viewport: { width: 412, height: 915 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3.5,
    },
  },
  {
    name: 'iPad Pro 11',
    kind: 'tablet',
    use: {
      viewport: { width: 834, height: 1194 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  },
  {
    name: 'Samsung Galaxy Tab S9',
    kind: 'tablet',
    use: {
      viewport: { width: 800, height: 1280 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  },
] as const;

async function expectNoHorizontalOverflow(page: any) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
}

for (const device of deviceProfiles) {
  test.describe(`${device.name} responsive layout`, () => {
    test.use(device.use);

    test('should keep core sections visible without horizontal overflow', async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.heroSection).toBeVisible();
      await homePage.liveFeedSection.scrollIntoViewIfNeeded();
      await expect(homePage.liveFeedSection).toBeVisible();
      await homePage.labSection.scrollIntoViewIfNeeded();
      await expect(homePage.labSection).toBeVisible();
      await homePage.newsletterSection.scrollIntoViewIfNeeded();
      await expect(homePage.newsletterSection).toBeVisible();
      await expectNoHorizontalOverflow(homePage.page);
    });

    test('should keep navigation usable for the viewport', async ({ homePage }) => {
      await homePage.goto();

      if (device.kind === 'phone') {
        await expect(homePage.navMenuBtn).toBeVisible();
        await homePage.openMobileMenuIfNeeded();
        await expect(homePage.mobileMenu).toBeVisible();
      } else if (await homePage.navMenuBtn.isVisible()) {
        await homePage.openMobileMenuIfNeeded();
        await expect(homePage.mobileMenu).toBeVisible();
      } else {
        await expect(homePage.navLinks.first()).toBeVisible();
      }

      await expectNoHorizontalOverflow(homePage.page);
    });

    test('should keep digest and chat access visible', async ({ homePage, chatbotPage }) => {
      await homePage.goto();
      await homePage.newsletterSection.scrollIntoViewIfNeeded();
      await expect(homePage.newsletterSection).toBeVisible();
      await expect(homePage.newsletterEmail).toBeVisible();
      await expect(homePage.newsletterForm).toBeVisible();
      await expect(chatbotPage.toggleBtn).toBeVisible();
      await chatbotPage.open();
      await expect(chatbotPage.window).toBeVisible();
      await expectNoHorizontalOverflow(homePage.page);
    });
  });
}
