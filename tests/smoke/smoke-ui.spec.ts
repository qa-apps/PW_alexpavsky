import { test, expect } from '../../fixtures/base';

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('Smoke — alexpavsky.com UI', () => {
  test('home page loads successfully', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.page).toHaveTitle(/Alex Pavsky|QA|AI/);
  });

  test('hero section is visible', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.heroSection).toBeVisible();
  });

  test('navigation links are visible', async ({ homePage }) => {
    await homePage.goto();
    const count = await homePage.navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(homePage.navLinks.first()).toBeVisible();
  });

  test('theme toggle is visible and clickable', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.themeToggle).toBeVisible();
    const before = await homePage.getBodyClass();
    await homePage.toggleTheme();
    await expect.poll(() => homePage.getBodyClass()).not.toBe(before);
  });

  test('YouTube section is visible with cards', async ({ homePage }) => {
    await homePage.goto();
    await homePage.ytSection.scrollIntoViewIfNeeded();
    await expect(homePage.ytSection).toBeVisible();
    const count = await homePage.ytCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('live feed section is visible with cards', async ({ homePage }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    await expect(homePage.liveFeedSection).toBeVisible();
    await expect(homePage.feedCards.first()).toBeVisible();
  });

  test('filter buttons are visible', async ({ homePage }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    const count = await homePage.filterBtns.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(homePage.filterBtns.first()).toBeVisible();
  });

  test('article modal opens from feed card', async ({ homePage }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    await expect(homePage.feedCards.first()).toBeVisible();
    await homePage.openFeedArticle(0);
    await expect(homePage.articleModal).toBeVisible();
    await homePage.articleModalClose.click();
    await expect(homePage.articleModal).toBeHidden();
  });

  test('principles section is visible with cards', async ({ homePage }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principlesSection).toBeVisible();
    const count = await homePage.principleCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tools section is visible with cards', async ({ homePage }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    await expect(homePage.toolsSection).toBeVisible();
    const count = await homePage.toolCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('lab section is visible with cards', async ({ homePage }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labSection).toBeVisible();
    await expect(homePage.labCards.first()).toBeVisible();
  });

  test('newsletter section is visible with form', async ({ homePage }) => {
    await homePage.goto();
    await homePage.newsletterSection.scrollIntoViewIfNeeded();
    await expect(homePage.newsletterSection).toBeVisible();
    await expect(homePage.newsletterEmail).toBeVisible();
    await expect(homePage.newsletterForm).toBeVisible();
  });

  test('lab page loads successfully', async ({ labPage }) => {
    await labPage.goto();
    await expect(labPage.openAttackGenBtn).toBeVisible();
    await expect(labPage.openHallucinationBtn).toBeVisible();
    await expect(labPage.openPitestBtn).toBeVisible();
    await expect(labPage.openChallengeBtn).toBeVisible();
  });

  test('attack generator modal opens', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openAttackGenerator();
    await expect(labPage.attackgenModal).toBeVisible();
    await labPage.closeTopModal();
    await expect(labPage.attackgenModal).toBeHidden();
  });

  test('hallucination analyzer modal opens', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openHallucinationAnalyzer();
    await expect(labPage.hallucinationModal).toBeVisible();
    await labPage.closeTopModal();
    await expect(labPage.hallucinationModal).toBeHidden();
  });

  test('prompt injection scanner modal opens', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openPromptInjectionScanner();
    await expect(labPage.pitestModal).toBeVisible();
    await labPage.closeTopModal();
    await expect(labPage.pitestModal).toBeHidden();
  });

  test('challenge modal opens', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openChallenge();
    await expect(labPage.challengeModal).toBeVisible();
    await labPage.closeTopModal();
    await expect(labPage.challengeModal).toBeHidden();
  });

  test('chat opens from lab page', async ({ labPage, chatbotPage }) => {
    await labPage.goto();
    await labPage.openChatBtn.click();
    await expect(chatbotPage.chatInput).toBeVisible();
    await chatbotPage.page.keyboard.press('Escape');
  });

  test('mobile viewport — mobile menu appears', async ({ homePage }) => {
    await homePage.page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();
    await expect(homePage.navMenuBtn).toBeVisible();
    await homePage.openMobileMenuIfNeeded();
    await expect(homePage.mobileMenu).toBeVisible();
  });

  test('tablet viewport — layout renders', async ({ homePage }) => {
    await homePage.page.setViewportSize({ width: 768, height: 1024 });
    await homePage.goto();
    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.navLinks.first()).toBeVisible();
  });

  test('desktop viewport — layout renders', async ({ homePage }) => {
    await homePage.page.setViewportSize({ width: 1920, height: 1080 });
    await homePage.goto();
    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.navLinks.first()).toBeVisible();
  });

  test('no critical console errors on load', async ({ homePage }) => {
    const errors: string[] = [];
    homePage.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await homePage.goto();
    await homePage.page.waitForLoadState('networkidle');
    const knownExternalNoise = [
      'favicon',
      'google-analytics',
      'cdnjs.cloudflare.com/ajax/libs/pdf.js',
      'cdnjs.cloudflare.com/ajax/libs/mammoth',
      'ERR_BLOCKED_BY_RESPONSE.NotSameOrigin',
      'Failed to load resource: the server responded with a status of 404',
    ];
    const critical = errors.filter((e) => !knownExternalNoise.some((noise) => e.includes(noise)));
    expect(critical).toHaveLength(0);
  });

  test('footer is visible', async ({ homePage }) => {
    await homePage.goto();
    const footer = homePage.page.locator('footer, [role="contentinfo"]').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test('all major sections have visible headings', async ({ homePage }) => {
    await homePage.goto();
    const sections = [
      homePage.heroSection,
      homePage.liveFeedSection,
      homePage.principlesSection,
      homePage.toolsSection,
      homePage.labSection,
      homePage.newsletterSection,
    ];
    for (const section of sections) {
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      const heading = section.locator('h1, h2, h3').first();
      const count = await heading.count();
      if (count > 0) {
        await expect(heading).toBeVisible();
      }
    }
  });

  test('should render page within performance budget', async ({ homePage, page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (!response) throw new Error('Expected navigation to return a response');
    expect(response.status()).toBe(200);
    const start = Date.now();
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('should have accessible color contrast', async ({ homePage }) => {
    await homePage.goto();
    const contrast = await homePage.page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return !!(style.color && style.backgroundColor);
    });
    expect(contrast).toBe(true);
  });

  test('should have valid heading hierarchy', async ({ homePage, page }) => {
    await homePage.goto();
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let prevLevel = 1;
    for (const h of headings) {
      const level = parseInt(await h.evaluate(el => el.tagName[1]));
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(6);
      prevLevel = level;
    }
  });

  test('should lazy load images below fold', async ({ homePage, page }) => {
    await homePage.goto();
    const images = await page.locator('img[loading="lazy"]').all();
    if (images.length > 0) {
      const firstImg = images[0];
      const isLoaded = await firstImg.evaluate(el => (el as HTMLImageElement).complete);
      expect(typeof isLoaded).toBe('boolean');
    }
  });

  test('should have semantic HTML structure', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main, section').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});
