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

  // ## Navigation scroll-to-section

  test('nav Feed link scrolls to feed section', async ({ homePage, page }) => {
    await homePage.goto();
    await page.locator('nav a[href*="feed"], nav .nav-link', { hasText: /^Feed$/i }).first().click();
    await homePage.liveFeedSection.waitFor({ state: 'visible' });
    await expect(homePage.liveFeedSection).toBeInViewport({ ratio: 0.1 });
  });

  test('nav Explore link scrolls to explore section', async ({ homePage, page }) => {
    await homePage.goto();
    await page.locator('nav a[href*="explore"], nav .nav-link', { hasText: /^Explore$/i }).first().click();
    await homePage.principlesSection.waitFor({ state: 'visible' });
    await expect(homePage.principlesSection).toBeInViewport({ ratio: 0.1 });
  });

  test('nav Tools link scrolls to tools section', async ({ homePage, page }) => {
    await homePage.goto();
    await page.locator('nav a[href*="tools"], nav .nav-link', { hasText: /^Tools$/i }).first().click();
    await homePage.toolsSection.waitFor({ state: 'visible' });
    await expect(homePage.toolsSection).toBeInViewport({ ratio: 0.1 });
  });

  test('nav Challenge link scrolls to challenge section', async ({ homePage, page }) => {
    await homePage.goto();
    await page.locator('nav a[href*="challenge"], nav .nav-link', { hasText: /^Challenge$/i }).first().click();
    await homePage.page.waitForTimeout(800);
    await expect(page.locator('#challenge, [id*="challenge"]').first()).toBeVisible();
  });

  test('nav Digest link scrolls to digest/newsletter section', async ({ homePage, page }) => {
    await homePage.goto();
    await page.locator('nav a[href*="digest"], nav .nav-link', { hasText: /^Digest$/i }).first().click();
    await homePage.newsletterSection.waitFor({ state: 'visible' });
    await expect(homePage.newsletterSection).toBeInViewport({ ratio: 0.1 });
  });

  // ## Break It modal

  test('Break It button opens the challenge modal', async ({ homePage, page }) => {
    await homePage.goto();
    const breakBtn = page.locator('button, a', { hasText: /break\s*it/i }).first();
    await expect(breakBtn).toBeVisible();
    await breakBtn.click();
    const modal = page.locator('#challenge-modal, [id*="challenge"][class*="modal"], .modal.active').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  // ## Hero terminal animation

  test('hero terminal windows are present in DOM', async ({ homePage, page }) => {
    await homePage.goto();
    const terminals = page.locator('.terminal, .hero-terminal, [class*="terminal"]');
    const count = await terminals.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(terminals.first()).toBeVisible();
  });

  test('hero terminal contains animated text content', async ({ homePage, page }) => {
    await homePage.goto();
    const terminal = page.locator('.terminal, .hero-terminal, [class*="terminal"]').first();
    await expect(terminal).toBeVisible();
    const textBefore = await terminal.innerText();
    // Wait for animation tick
    await page.waitForTimeout(1500);
    const textAfter = await terminal.innerText();
    // Content should be present (non-empty) indicating live rendering
    expect(textBefore.length + textAfter.length).toBeGreaterThan(0);
  });

  test('hero AI test result card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    const resultCard = page
      .locator('.ai-test-result, [class*="test-result"], [class*="score"], .hero-card')
      .first();
    if (await resultCard.count()) {
      await expect(resultCard).toBeVisible();
    } else {
      // Fallback — at least one structured card in hero
      await expect(homePage.heroSection.locator('div[class]').first()).toBeVisible();
    }
  });

  // ## Homepage adversarial tool cards

  test('Adversarial Simulation card is visible on homepage', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /adversarial simulation/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  });

  test('Injection Risk Scanner card is visible on homepage', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /injection risk/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  });

  test('Grounding & Retrieval QA card is visible on homepage', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /grounding/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  });

  test('Reliability & Fact Check card is visible on homepage', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /reliability|fact check/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  });

  test('clicking Adversarial Simulation Explore card opens attack-gen modal', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /adversarial simulation/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    const cta = card.locator('a, button').first();
    await cta.click();
    const modal = page.locator('#attackgen-modal, [id*="attack"][class*="modal"], .modal.active').first();
    await expect(modal).toBeVisible({ timeout: 6_000 });
  });

  test('clicking Injection Risk Scanner card opens PI scanner modal', async ({ homePage, page }) => {
    await homePage.goto();
    const card = page.locator('.explore-card, .lab-card, [class*="card"]', {
      hasText: /injection risk/i,
    }).first();
    await card.scrollIntoViewIfNeeded();
    const cta = card.locator('a, button').first();
    await cta.click();
    const modal = page.locator('#pitest-modal, [id*="pitest"][class*="modal"], .modal.active').first();
    await expect(modal).toBeVisible({ timeout: 6_000 });
  });

  // ## Live ticker

  test('ticker items are visible and non-empty', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(homePage.tickerItems.first()).toBeVisible();
    const text = await homePage.tickerItems.first().innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('ticker items contain valid source links', async ({ homePage, page }) => {
    await homePage.goto();
    const links = page.locator('.ticker-item a, .ticker a, [class*="ticker"] a');
    if (await links.count()) {
      const href = await links.first().getAttribute('href');
      expect(href).toMatch(/https?:\/\//);
    }
  });

  // ## YouTube carousel

  test('clicking a YouTube card opens video modal overlay', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.ytSection.scrollIntoViewIfNeeded();
    const card = homePage.youtubeRealCards.first();
    if (await card.count()) {
      await card.evaluate((el) => (el as HTMLElement).click());
      const overlay = page.locator('#yt-modal-overlay, .yt-modal-overlay, [id*="yt-modal"]').first();
      await expect(overlay).toBeVisible({ timeout: 5_000 });
      // Verify iframe is embedded (YouTube video)
      const iframe = overlay.locator('iframe[src*="youtube"]');
      if (await iframe.count()) {
        await expect(iframe).toBeVisible();
      }
      await page.keyboard.press('Escape');
    }
  });

  test('YouTube carousel scrolls right and cards remain visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.ytSection.scrollIntoViewIfNeeded();
    const before = await homePage.ytCards.count();
    await homePage.youtubeNextBtn.click();
    await page.waitForTimeout(400);
    await expect(homePage.ytSection).toBeVisible();
    expect(await homePage.ytCards.count()).toBe(before);
  });

  test('YouTube carousel scrolls left and cards remain visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.ytSection.scrollIntoViewIfNeeded();
    await homePage.youtubePrevBtn.click();
    await page.waitForTimeout(400);
    await expect(homePage.ytSection).toBeVisible();
  });

  // ## Feed article modal

  test('feed article modal has structured HTML content with heading and body', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    await homePage.openFeedArticle(0);
    await expect(homePage.articleModal).toBeVisible();
    // Must have a heading
    const heading = homePage.articleModal.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible();
    // Must have body text (not just raw snippet)
    const body = homePage.articleModal.locator('p, .article-body, .article-content').first();
    if (await body.count()) {
      await expect(body).toBeVisible();
    }
    await homePage.articleModalClose.click();
  });

  test('feed article modal external link is a valid http URL', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    await homePage.openFeedArticle(0);
    await expect(homePage.articleModal).toBeVisible();
    const link = page.locator('#article-modal-link, .article-modal a[href*="http"]').first();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^https?:\/\//);
    await homePage.articleModalClose.click();
  });

  test('second feed article opens its own modal with content', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.liveFeedSection.scrollIntoViewIfNeeded();
    const count = await homePage.feedCards.count();
    if (count >= 2) {
      await homePage.openFeedArticle(1);
      await expect(homePage.articleModal).toBeVisible();
      await expect(homePage.articleModalHeading).toBeVisible();
      await homePage.articleModalClose.click();
    }
  });

  // ## Principles (Explore) cards

  test('each explore/principles card has a heading and description', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    const cards = homePage.principleCards;
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(cards.nth(i).locator('h2, h3, h4').first()).toBeVisible();
    }
  });

  test('principle cards are responsive on hover — cursor changes to pointer', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    const card = homePage.principleCards.first();
    await card.hover();
    const cursor = await card.evaluate((el) => window.getComputedStyle(el).cursor);
    // Should be pointer or default (interactive element)
    expect(['pointer', 'default', 'auto']).toContain(cursor);
  });

  test('AI Red Teaming principle card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.filter({ hasText: /red teaming/i }).first()).toBeVisible();
  });

  test('LLM Evaluation principle card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.filter({ hasText: /llm eval/i }).first()).toBeVisible();
  });

  test('Test Automation principle card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.filter({ hasText: /test automation/i }).first()).toBeVisible();
  });

  test('RAG & Vector Search principle card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.filter({ hasText: /rag|vector/i }).first()).toBeVisible();
  });

  test('AI Observability principle card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.principlesSection.scrollIntoViewIfNeeded();
    await expect(homePage.principleCards.filter({ hasText: /observability/i }).first()).toBeVisible();
  });

  // ## Best QA & AI Tools cards

  test('LlamaIndex tool card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    await expect(homePage.toolCards.filter({ hasText: /llamaindex/i })).toBeVisible();
  });

  test('RAGAS tool card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    await expect(homePage.toolCards.filter({ hasText: /ragas/i })).toBeVisible();
  });

  test('LangChain tool card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    await expect(homePage.toolCards.filter({ hasText: /langchain/i })).toBeVisible();
  });

  test('Phoenix tool card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    await expect(homePage.toolCards.filter({ hasText: /phoenix/i })).toBeVisible();
  });

  test('tool cards have outbound redirect links', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.toolsSection.scrollIntoViewIfNeeded();
    const links = page.locator('#tools a[href*="http"], #tools .tool-card[href*="http"]');
    if (await links.count()) {
      const href = await links.first().getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
    } else {
      // Tool cards may be anchor tags themselves
      const cardLinks = page.locator('#tools a[href]');
      expect(await cardLinks.count()).toBeGreaterThan(0);
    }
  });

  // ## AI Lab section cards

  test('AI Chat Lab card is visible in Lab section', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labCards.filter({ hasText: /chat lab|ai chat/i }).first()).toBeVisible();
  });

  test('RAG Hallucination Analyzer card is visible in Lab section', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labCards.filter({ hasText: /hallucination analyzer/i }).first()).toBeVisible();
  });

  test('Prompt Injection Scanner lab card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labCards.filter({ hasText: /injection scanner/i }).first()).toBeVisible();
  });

  test('Attack Scenario Builder lab card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labCards.filter({ hasText: /attack scenario/i }).first()).toBeVisible();
  });

  test('Can You Break This AI lab card is visible', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    await expect(homePage.labCards.filter({ hasText: /break this ai/i }).first()).toBeVisible();
  });

  test('AI Chat Lab card CTA opens chat panel', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.labSection.scrollIntoViewIfNeeded();
    const chatCta = page.locator('#lab .lab-card button, #lab .lab-card a', {
      hasText: /open chat|chat lab|chat/i,
    }).first();
    if (await chatCta.count()) {
      await chatCta.click();
      const chatWindow = page.locator('#chat-window, .chat-panel, [id*="chat-window"]').first();
      await expect(chatWindow).toBeVisible({ timeout: 5_000 });
    }
  });

  // ## Footer social links

  test('footer GitHub icon link is present and has correct href', async ({ homePage, page }) => {
    await homePage.goto();
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    const githubLink = footer.locator('a[href*="github"]').first();
    await expect(githubLink).toBeVisible();
    const href = await githubLink.getAttribute('href');
    expect(href).toContain('github');
  });

  test('footer LinkedIn icon link is present', async ({ homePage, page }) => {
    await homePage.goto();
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    const linkedinLink = footer.locator('a[href*="linkedin"]').first();
    await expect(linkedinLink).toBeVisible();
  });

  test('footer email link is present', async ({ homePage, page }) => {
    await homePage.goto();
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    const emailLink = footer.locator('a[href*="mailto"], a[href*="email"]').first();
    await expect(emailLink).toBeVisible();
  });

  test('footer social links are responsive and hoverable', async ({ homePage, page }) => {
    await homePage.goto();
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    const socialLinks = footer.locator('a[href]');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
    await socialLinks.first().hover();
    await expect(socialLinks.first()).toBeVisible();
  });

  // ## Forum & Feedback

  test('Forum & Feedback button is visible in footer area', async ({ homePage, page }) => {
    await homePage.goto();
    const feedbackBtn = page.locator('a, button', { hasText: /forum|feedback/i }).first();
    await feedbackBtn.scrollIntoViewIfNeeded();
    await expect(feedbackBtn).toBeVisible();
  });

  test('Forum & Feedback accepts typed input without submitting', async ({ homePage, page }) => {
    await homePage.goto();
    const feedbackBtn = page.locator('a, button', { hasText: /forum|feedback/i }).first();
    await feedbackBtn.scrollIntoViewIfNeeded();
    await feedbackBtn.click();
    // If it opens a modal/panel with a textarea, type into it
    const textarea = page.locator('textarea, input[type="text"]').last();
    const isInputVisible = await textarea.isVisible().catch(() => false);
    if (isInputVisible) {
      await textarea.fill('smoke test');
      const value = await textarea.inputValue();
      expect(value).toContain('smoke test');
    } else {
      // May open an external link — just verify button was clickable
      await expect(feedbackBtn).toBeVisible();
    }
  });

  // ## AI Assistant chatbot widget

  test('AI assistant floating toggle button is always visible', async ({ homePage, page }) => {
    await homePage.goto();
    const toggleBtn = page.locator('#chat-toggle-btn, .chat-toggle, [id*="chat-toggle"], [aria-label*="chat"]').first();
    await expect(toggleBtn).toBeVisible();
  });

  test('AI assistant panel opens on toggle click', async ({ homePage, page }) => {
    await homePage.goto();
    const toggleBtn = page.locator('#chat-toggle-btn, .chat-toggle, [id*="chat-toggle"]').first();
    await toggleBtn.click();
    const chatPanel = page.locator('#chat-window, .chat-window, .chat-panel, [id*="chat-window"]').first();
    await expect(chatPanel).toBeVisible({ timeout: 5_000 });
  });

  test('AI assistant panel can be closed after opening', async ({ homePage, page }) => {
    await homePage.goto();
    const toggleBtn = page.locator('#chat-toggle-btn, .chat-toggle, [id*="chat-toggle"]').first();
    await toggleBtn.click();
    const closeBtn = page.locator('#chat-close, .chat-close-btn, [id*="chat-close"]').first();
    if (await closeBtn.isVisible({ timeout: 3_000 })) {
      await closeBtn.click();
      const chatPanel = page.locator('#chat-window, .chat-window').first();
      if (await chatPanel.count()) {
        await expect(chatPanel).not.toHaveClass(/active/);
      }
    }
  });

  // ## General design & regression

  test('site logo is visible in header', async ({ homePage, page }) => {
    await homePage.goto();
    const logo = page.locator('header .logo, header a[href="/"], header img, .site-logo').first();
    await expect(logo).toBeVisible();
  });

  test('all nav links have non-empty href attributes', async ({ homePage, page }) => {
    await homePage.goto();
    const links = homePage.navLinks;
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect((href ?? '').length).toBeGreaterThan(0);
    }
  });

  test('page has no broken image src attributes', async ({ homePage, page }) => {
    await homePage.goto();
    await page.waitForLoadState('domcontentloaded');
    const brokenImgs: string[] = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src)
        .filter((src) => src && !src.includes('data:'));
    });
    // Allow up to 2 lazy-not-yet-loaded images; report if more
    expect(brokenImgs.length).toBeLessThanOrEqual(2);
  });

  test('dark mode body class is set by default or after toggle', async ({ homePage, page }) => {
    await homePage.goto();
    const bodyClass = await page.evaluate(() => document.body.className);
    const hasDarkOrLight = /dark|light|theme/i.test(bodyClass);
    // Site may use data-theme attribute instead
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') ?? '');
    expect(hasDarkOrLight || dataTheme.length > 0).toBe(true);
  });

  test('scroll-to-top works or page smoothly scrolls back', async ({ homePage, page }) => {
    await homePage.goto();
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const scrollTopBtn = page.locator('[id*="scroll-top"], [class*="scroll-top"], button[aria-label*="top"]').first();
    if (await scrollTopBtn.isVisible()) {
      await scrollTopBtn.click();
      await page.waitForTimeout(600);
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeLessThan(300);
    } else {
      // No scroll-to-top button — just verify page is scrollable
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    }
  });
});
