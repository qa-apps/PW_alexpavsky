import { test, expect } from '@playwright/test';

/**
 * Live Feed + Article modal backend regression suite.
 *
 * These tests exist because Playwright UI tests in feed.spec.ts only check
 * that the modal *wrapper* opens — they don't notice when the iframe loads
 * an error page (e.g. http.server's "Error code: 404 / File not found").
 *
 * Bug history: chat_server.py was missing /api/feed, /api/article-proxy,
 * /api/article-page, /api/article-embed — script.js called them anyway and
 * users saw a 404 inside every article modal. UI tests passed, prod broke.
 *
 * Rule: every API the frontend calls gets a direct request-level test here.
 */

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';
const SAMPLE_ARTICLE = 'https://huggingface.co/blog';

test.describe('Live Feed + Article API', () => {
  test('GET /api/feed returns at least one article', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/feed`);
    expect(r.status(), 'feed endpoint should return 200').toBe(200);
    const data = await r.json();
    expect(Array.isArray(data.articles), 'response must have articles array').toBe(true);
    // Empty feed means we'd render "No articles found" and force the slow
    // allorigins.win browser fallback — that's the empty-on-first-load bug.
    expect(data.articles.length, 'feed must not be empty').toBeGreaterThan(0);

    const first = data.articles[0];
    expect(first.title, 'article must have title').toBeTruthy();
    expect(first.link, 'article must have link').toMatch(/^https?:\/\//);
    expect(first.source, 'article must have source name').toBeTruthy();
  });

  test('GET /api/article-proxy returns JSON with image/title fields', async ({ request }) => {
    const r = await request.get(
      `${BASE_URL}/api/article-proxy?url=${encodeURIComponent(SAMPLE_ARTICLE)}`
    );
    expect(r.status(), 'article-proxy must respond 200').toBe(200);
    expect(r.headers()['content-type'], 'must be JSON').toContain('application/json');
    const data = await r.json();
    // image may be null if the source blocks scrapers — that's fine.
    // What matters: the endpoint exists and returns valid JSON, not a 404
    // page from BaseHTTPRequestHandler.
    expect(data).toHaveProperty('image');
    expect(data).toHaveProperty('title');
  });

  test('GET /api/article-page returns reader-mode HTML, not a 404 error page', async ({ request }) => {
    const r = await request.get(
      `${BASE_URL}/api/article-page?url=${encodeURIComponent(SAMPLE_ARTICLE)}&theme=dark`
    );
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type'] || '').toContain('text/html');
    const body = await r.text();
    // Negative: must not be the SimpleHTTPRequestHandler default error.
    expect(body, 'must not be the http.server 404 page').not.toContain('Error response');
    expect(body).not.toContain('Error code: 404');
    expect(body).not.toContain('File not found');
    // Positive: must be either our reader render OR our friendly fallback.
    const isReader = body.includes('article-modal-source-banner');
    const isFallback = body.includes('Article preview unavailable');
    expect(isReader || isFallback, 'expected reader HTML or friendly fallback').toBe(true);
  });

  test('GET /api/article-embed returns full-page HTML, not a 404 error page', async ({ request }) => {
    const r = await request.get(
      `${BASE_URL}/api/article-embed?url=${encodeURIComponent(SAMPLE_ARTICLE)}`
    );
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).not.toContain('Error code: 404');
    expect(body).not.toContain('File not found');
  });

  test('GET /api/article-page with missing url param returns 400, not 500', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/article-page`);
    expect(r.status()).toBe(400);
  });

  test('GET /api/article-proxy with missing url param returns 400 JSON', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/api/article-proxy`);
    expect(r.status()).toBe(400);
    expect(r.headers()['content-type'] || '').toContain('application/json');
  });
});

test.describe('Article modal — reader-area load (E2E)', () => {
  test('opening a feed article must not show a 4xx error page in the modal', async ({ page }) => {
    // Record any /api/article-* response so we can fail fast on a 4xx — but
    // the reader-content assertion below is the real safety net.
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      const u = resp.url();
      if (u.includes('/api/article-page') || u.includes('/api/article-embed') || u.includes('/api/article-proxy')) {
        apiResponses.push({ url: u, status: resp.status() });
      }
    });

    await page.goto(BASE_URL + '/');
    const card = page.locator('.feed-card').first();
    // CI runners have higher network jitter — give the upstream RSS fetch
    // headroom. Local runs typically resolve in ~3–5s.
    await card.waitFor({ state: 'visible', timeout: 35_000 });
    await card.click();

    const modal = page.locator('#article-modal-overlay, .article-modal').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Production now renders article content (or its fallback) into the
    // #article-modal-reader div; the iframe is hidden. See production
    // script.js:944-951 — the .loaded class is added once content/fallback
    // is in place.
    const reader = page.locator('#article-modal-reader');
    await expect(reader).toHaveClass(/loaded/, { timeout: 15_000 });

    // Real check: assert the reader body isn't the BaseHTTPRequestHandler
    // 404 page (which is exactly what users saw in production before the
    // article-proxy fix).
    const bodyText = await reader.innerText({ timeout: 5_000 }).catch(() => '');
    const body = (bodyText || '').slice(0, 4000);
    expect(body, 'reader must not render the http.server 404 error page').not.toContain('Error code: 404');
    expect(body, 'reader must not render the http.server file-not-found error').not.toContain('File not found');

    // If any of our endpoints did respond, none should be 4xx/5xx.
    for (const r of apiResponses) {
      expect(r.status, `article endpoint ${r.url} returned ${r.status}`).toBeLessThan(400);
    }
  });
});
