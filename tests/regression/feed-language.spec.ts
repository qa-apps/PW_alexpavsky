import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';
const INCIDENT_RE = /di-era-ai-yang-menang-bukan-yang-kerja-paling-banyak|yang menang bukan yang kerja paling banyak|kielltampubolon/i;

type FeedArticle = {
  source?: string;
  title?: string;
  link?: string;
  description?: string;
};

type NormalizedFeedArticle = {
  source: string;
  title: string;
  link: string;
  text: string;
};

const LATIN_NON_ENGLISH_STOPWORDS = new Set([
  'adalah', 'agar', 'akan', 'atau', 'banyak', 'bukan', 'dalam', 'dan',
  'dari', 'dengan', 'di', 'ini', 'itu', 'jadi', 'kalau', 'karena',
  'kerja', 'lebih', 'mana', 'menang', 'mereka', 'paling', 'pada',
  'saya', 'sebagai', 'sebuah', 'semua', 'tidak', 'untuk', 'yang',
]);

const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'after', 'ai', 'and', 'are', 'as', 'at', 'be', 'by',
  'for', 'from', 'how', 'in', 'into', 'is', 'it', 'of', 'on', 'or',
  'the', 'this', 'to', 'with', 'what', 'when', 'why', 'you', 'your',
]);

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isEnglishishFeedText(text: string): boolean {
  if (!text.trim()) return true;
  if (/[\u0370-\u03ff\u0400-\u052f\u0590-\u05ff\u0600-\u06ff\u0900-\u0dff\u0e00-\u0e7f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(text)) {
    return false;
  }
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]/.test(text)) return false;

  const words = (text.toLowerCase().match(/[a-z][a-z']*/g) || []).map((word) => word.replace(/^'+|'+$/g, ''));
  const nonEnglishHits = words.filter((word) => LATIN_NON_ENGLISH_STOPWORDS.has(word)).length;
  if (nonEnglishHits < 3) return true;

  const englishHits = words.filter((word) => ENGLISH_STOPWORDS.has(word)).length;
  const ratio = nonEnglishHits / Math.max(1, words.length);
  return englishHits >= 3 && ratio < 0.18;
}

test.describe('Live feed language quality', {
  tag: ['@regression', '@pure'],
}, () => {
  test('GET /api/feed returns English-only public articles', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/feed`, { timeout: 45_000 });
    expect(response.status(), 'feed endpoint should return 200').toBe(200);

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    expect(articles.length, 'feed must not be empty').toBeGreaterThan(0);

    const bad = articles
      .map((article: FeedArticle): NormalizedFeedArticle => ({
        source: String(article.source || ''),
        title: String(article.title || ''),
        link: String(article.link || ''),
        text: [article.title, stripHtml(String(article.description || '')), article.link].join(' '),
      }))
      .filter((article: NormalizedFeedArticle) => INCIDENT_RE.test(article.text) || !isEnglishishFeedText(article.text));

    expect(
      bad.map((article: NormalizedFeedArticle) => `${article.source} | ${article.title} | ${article.link}`),
      'public feed must not include non-English articles'
    ).toEqual([]);
  });

  test('Live Alerts ignores cached non-English articles', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('alexpavsky_live_rail_v2', JSON.stringify({
        ts: Date.now(),
        items: [
          {
            category: 'dev',
            title: 'Di era AI, yang menang bukan yang kerja paling banyak',
            source: 'Dev.to',
            link: 'https://dev.to/kielltampubolon/di-era-ai-yang-menang-bukan-yang-kerja-paling-banyak-5fp4',
            description: 'Saya mulai dari pertanyaan yang kelihatannya sederhana.',
            date: new Date().toISOString(),
          },
          {
            category: 'qa',
            title: 'Playwright regression checks keep public feeds clean',
            source: 'QA Automation',
            link: 'https://www.alexpavsky.com/',
            description: 'English quality gate for public feed items.',
            date: new Date().toISOString(),
          },
        ],
      }));
    });

    await page.goto(BASE_URL + '/');
    await page.locator('#liveHandle').click();

    await expect(page.locator('.live-item-title', { hasText: /Playwright regression checks/i }).first()).toBeVisible();
    await expect(page.locator('.live-item-title', { hasText: /yang menang bukan yang kerja/i })).toHaveCount(0);
  });
});
