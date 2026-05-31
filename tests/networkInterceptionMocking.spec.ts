/**
 * networkInterceptionMocking.spec.ts
 *
 * Demonstrates how Playwright's page.route() is used to intercept and
 * mock backend responses, so we can verify how the frontend behaves
 * under unhappy conditions (5xx, 4xx, network abort, slow response)
 * without actually breaking the real backend.
 *
 * Every assertion is anchored to a REAL UI string from
 * alexpavsky/script.js — no invented text. Line references are listed
 * in the comments so the spec stays grep-friendly when the source
 * changes.
 *
 * Sources:
 *  - newsletter:          script.js:1719-1747  (#newsletter-msg.error/success)
 *  - chatbot:             script.js:3540-3625  (graceful reply / getFallbackReply)
 *  - feed:                script.js:728-772    (silent fallback to FEED_FALLBACK_ARTICLES)
 *  - article-page reader: script.js:888-988    (#article-modal-reader fallback texts)
 */

import { test, expect } from '../utils/fixtures';

test.describe('Network interception & mocking', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Newsletter form — one mock per backend behavior
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Newsletter — /api/subscribe', () => {
    test('500 from server → shows server error text in newsletter message', async ({ page, homePage }) => {
      // IMPORTANT: route() must be set BEFORE goto() so even preflight
      // requests are intercepted.
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server is on fire' }),
        }),
      );

      await homePage.goto();
      await homePage.subscribe('user@example.com');

      // script.js:1757 — when res.ok is false and data.error is present,
      // the frontend echoes data.error verbatim.
      await expect(homePage.newsletterError).toBeVisible();
      await expect(homePage.newsletterError).toContainText('Server is on fire');
    });

    test('500 without error field → default text "Something went wrong."', async ({ page, homePage }) => {
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
      );

      await homePage.goto();
      await homePage.subscribe('user@example.com');

      await expect(homePage.newsletterError).toContainText('Something went wrong');
    });

    test('404 not found → still routed through the error branch', async ({ page, homePage }) => {
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint missing' }),
        }),
      );

      await homePage.goto();
      await homePage.subscribe('user@example.com');

      await expect(homePage.newsletterError).toContainText('Endpoint missing');
    });

    test('network abort → "Network error. Try again."', async ({ page, homePage }) => {
      // route.abort() raises a browser-level network failure that is
      // caught by the fetch catch block.
      await page.route('**/api/subscribe', (route) => route.abort('failed'));

      await homePage.goto();
      await homePage.subscribe('user@example.com');

      // script.js:1761
      await expect(homePage.newsletterError).toContainText('Network error');
    });

    test('200 success → success message', async ({ page, homePage }) => {
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Subscribed!' }),
        }),
      );

      await homePage.goto();
      await homePage.subscribe('user@example.com');

      await expect(homePage.newsletterSuccess).toBeVisible();
      await expect(homePage.newsletterSuccess).toContainText('Subscribed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Live Feed — mock /api/feed with our own articles
  // ───────────────────────────────────────────────────────────────────────────
  // Note: tests covering "500 from /api/feed → FEED_FALLBACK_ARTICLES must
  // render" are intentionally NOT included here. The current production
  // FEED_FALLBACK_ARTICLES list has stale dates (March 2026) and the
  // isRecentFeedArticle filter (script.js:511) drops all of them, leaving
  // the grid empty on /api/feed failure. That is a real site bug tracked
  // separately, not the subject of this spec.
  test.describe('Live Feed — /api/feed', () => {
    test('mock /api/feed with two custom articles → they render in the grid', async ({ page, homePage }) => {
      const today = new Date().toISOString();
      // Response shape contract (see script.js:751): { articles: [...] }.
      // Article fields match what the RSS normalizer on the backend emits.
      const fake = {
        articles: [
          {
            title: 'MOCKED ARTICLE ONE',
            description: 'Fully synthetic article for assertion.',
            link: 'https://example.com/one',
            source: 'Test Source',
            category: 'qa',
            date: today,
            image: '',
          },
          {
            title: 'MOCKED ARTICLE TWO',
            description: 'Second one.',
            link: 'https://example.com/two',
            source: 'Test Source',
            category: 'ai',
            date: today,
            image: '',
          },
        ],
      };
      await page.route('**/api/feed**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fake) }),
      );

      await homePage.goto();
      await expect(homePage.feedCards.first()).toBeVisible({ timeout: 25_000 });
      // .first() because the title also appears in the ticker (see
      // updateTicker in script.js) — one match is enough.
      await expect(page.locator('.feed-card', { hasText: 'MOCKED ARTICLE ONE' }).first()).toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Article modal — /api/article-page failures and slow responses
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Article modal — /api/article-page', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.feedCards.first()).toBeVisible({ timeout: 25_000 });
    });

    // On production, article content (or its fallback) is rendered into
    // the #article-modal-reader div; the iframe is hidden. See
    // production script.js:944-951.

    test('5xx → reader shows EXACT string "Full reader preview is unavailable..."', async ({ page, homePage }) => {
      await page.route('**/api/article-page**', (route) =>
        route.fulfill({ status: 500, contentType: 'text/html', body: '<!doctype html><html><body>boom</body></html>' }),
      );

      await homePage.openFeedArticle(0);
      const reader = page.locator('#article-modal-reader');
      await expect(reader).toHaveClass(/loaded/, { timeout: 15_000 });
      // Exact string from production script.js:981
      await expect(reader).toContainText(
        'Full reader preview is unavailable for this publisher. Showing the RSS preview.',
      );
    });

    test('slow response > 9s → reader shows EXACT string "...took too long..."', async ({ page, homePage }) => {
      // Delay the response by 12 seconds — longer than the
      // client-side iframeLoadTimer (9000 ms).
      await page.route('**/api/article-page**', async (route) => {
        await new Promise((r) => setTimeout(r, 12_000));
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>late</body></html>' });
      });

      await homePage.openFeedArticle(0);
      const reader = page.locator('#article-modal-reader');
      await expect(reader).toHaveClass(/loaded/, { timeout: 20_000 });
      // Exact string from production script.js:983
      await expect(reader).toContainText(
        'Full reader preview took too long. Showing the RSS preview.',
      );
    });

    test('200 but body marked "Article preview unavailable" → "publisher blocks..." fallback', async ({ page, homePage }) => {
      // Per script.js:974-976, if the HTML body contains
      // "Article preview unavailable" or "We couldn't fetch this
      // article", the frontend throws "source blocked" and shows the
      // third fallback branch (script.js:985).
      await page.route('**/api/article-page**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body><h2>Article preview unavailable</h2><p>The source blocked us.</p></body></html>',
        }),
      );

      await homePage.openFeedArticle(0);
      const reader = page.locator('#article-modal-reader');
      await expect(reader).toHaveClass(/loaded/, { timeout: 15_000 });
      await expect(reader).toContainText(
        'This publisher blocks embedded reader previews. Showing the RSS preview.',
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Chatbot — graceful reply, fallback by topic, and exact server reply
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Chatbot — /api/chat', () => {
    test('500 without graceful reply on "hello" → EXACT greeting fallback', async ({ page, chatbotPage }) => {
      await page.route('**/api/chat', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'down' }) }),
      );

      await chatbotPage.openAndConsent();
      await chatbotPage.sendMessage('hello');

      // getFallbackReply (script.js:3611) is deterministic: for the
      // /^(hi|hello)/ branch it ALWAYS returns this exact string.
      await expect(chatbotPage.finishedAiMessage).toContainText(
        'Hey there! Ask me anything — AI testing, coding, science, history, or just chat.',
        { timeout: 20_000 },
      );
    });

    test('500 on "playwright" → EXACT playwright fallback', async ({ page, chatbotPage }) => {
      // Different branch of getFallbackReply: it picks a reply by regex
      // against the user message → different text per topic.
      await page.route('**/api/chat', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
      );

      await chatbotPage.openAndConsent();
      await chatbotPage.sendMessage('Tell me about playwright');

      await expect(chatbotPage.finishedAiMessage).toContainText(
        'Playwright is excellent for E2E testing',
        { timeout: 20_000 },
      );
    });

    test('200 with custom reply → UI prints EXACTLY the server reply', async ({ page, chatbotPage }) => {
      // Proves the frontend prints exactly what the server sent — no
      // trimming, no translation, no substitution. Mock with a unique
      // marker string.
      const marker = 'MOCK_SERVER_REPLY_42_unique_marker_string';
      await page.route('**/api/chat', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: marker }),
        }),
      );

      await chatbotPage.openAndConsent();
      await chatbotPage.sendMessage('anything');

      await expect(chatbotPage.finishedAiMessage).toContainText(marker, { timeout: 15_000 });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. HTTP error matrix — sweep across error codes per endpoint
  // ───────────────────────────────────────────────────────────────────────────
  // Systematically run 401 / 403 / 404 / 502 / 503 against three
  // endpoints to confirm that a meaningful error / fallback is shown
  // to the user. If 502 ever starts looking like a 200 (or shows
  // nothing) this matrix will catch it.
  //
  // /api/feed is excluded from the matrix because the stale
  // FEED_FALLBACK_ARTICLES list (combined with filterPreviewableFeedArticles
  // + isRecentFeedArticle) drops everything to zero — a separate site
  // bug, not in scope for this spec.
  const ERROR_CODES = [401, 403, 404, 502, 503];

  for (const code of ERROR_CODES) {
    test(`newsletter: ${code} → echoes the exact server-provided error text`, async ({ page, homePage }) => {
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({
          status: code,
          contentType: 'application/json',
          body: JSON.stringify({ error: `Server returned ${code}` }),
        }),
      );
      await homePage.goto();
      await homePage.subscribe('user@example.com');
      await expect(homePage.newsletterError).toBeVisible();
      await expect(homePage.newsletterError).toContainText(`Server returned ${code}`);
    });

    test(`newsletter: ${code} without payload → default "Something went wrong"`, async ({ page, homePage }) => {
      await page.route('**/api/subscribe', (route) =>
        route.fulfill({ status: code, contentType: 'application/json', body: '{}' }),
      );
      await homePage.goto();
      await homePage.subscribe('user@example.com');
      await expect(homePage.newsletterError).toContainText('Something went wrong');
    });

    test(`article modal: ${code} → EXACT fallback string in reader`, async ({ page, homePage }) => {
      await page.route('**/api/article-page**', (route) =>
        route.fulfill({ status: code, contentType: 'text/html', body: 'err' }),
      );
      await homePage.goto();
      await expect(homePage.feedCards.first()).toBeVisible({ timeout: 25_000 });
      await homePage.openFeedArticle(0);
      const reader = page.locator('#article-modal-reader');
      await expect(reader).toHaveClass(/loaded/, { timeout: 15_000 });
      // Every non-2xx code must produce the same string (script.js:981).
      // If the frontend ever starts showing "Authorization required" on
      // 401, this test will fail and surface the UX-matrix change.
      await expect(reader).toContainText(
        'Full reader preview is unavailable for this publisher. Showing the RSS preview.',
      );
    });

    test(`chatbot: ${code} → EXACT "hello" fallback from getFallbackReply`, async ({ page, chatbotPage }) => {
      await page.route('**/api/chat', (route) =>
        route.fulfill({ status: code, contentType: 'application/json', body: '{}' }),
      );
      await chatbotPage.openAndConsent();
      await chatbotPage.sendMessage('hello');
      await expect(chatbotPage.finishedAiMessage).toContainText(
        'Hey there! Ask me anything — AI testing, coding, science, history, or just chat.',
        { timeout: 20_000 },
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Performance — block images/fonts to speed up the page load
  // ───────────────────────────────────────────────────────────────────────────
  test('blocking images & fonts speeds up page load', async ({ page, homePage }) => {
    await page.route('**/*', (route) => {
      const t = route.request().resourceType();
      if (t === 'image' || t === 'font' || t === 'media') return route.abort();
      return route.continue();
    });

    const t0 = Date.now();
    await homePage.goto();
    await expect(homePage.liveFeedSection).toBeVisible();
    const dt = Date.now() - t0;

    // Not a fixed budget — sanity check that the page still loads.
    // The main value of this test is the pattern itself: how to speed
    // up CI by suppressing non-essential resources.
    console.log(`page ready in ${dt}ms with images/fonts blocked`);
    expect(dt).toBeLessThan(20_000);
  });
});
