/**
 * contentQuality.spec.ts
 *
 * Catches the failure mode the user reported repeatedly:
 *   - article modal opens, but body is empty / 3 random words / an
 *     "offline" notice / a "preview unavailable" fallback / a
 *     Datawrapper "content blocked" page.
 *   - functional tests pass because the modal element is visible, the
 *     title is set, and there's "some" text — but the content is junk.
 *
 * What's new vs feed.spec.ts / feed-api.spec.ts:
 *   - iterates EVERY card in all three feeds (not just the first)
 *   - uses an LLM judge (utils/article-quality-judge.ts) to classify
 *     the rendered body as real-article (4-5) vs junk/empty/error (1-3)
 *   - records a screenshot per failing card so the report is
 *     human-readable, not just stack traces
 *   - validates LIVE rail item links return 2xx (no dead URLs)
 *   - validates YouTube carousel thumbnails actually loaded (no broken
 *     images that show only black squares to a recruiter)
 *
 * @upstream because results depend on real LLM responses and live RSS
 * sources — runs in the non-blocking CI lane.
 *
 * Configurable knobs:
 *   - PROBES_PER_FEED env var caps how many cards per feed get judged
 *     (default 4 — keeps the spec under ~3 min wall-clock).
 *   - MIN_PASS_RATIO env var sets the acceptance threshold per feed
 *     (default 0.75 — 75% of probed cards must be real content).
 */

import { test, expect } from '../utils/fixtures';
import type { Page } from '@playwright/test';
import { runArticleQualityJudge } from '../utils/article-quality-judge';

const PROBES_PER_FEED = Math.max(1, Number(process.env.PROBES_PER_FEED || '4'));
const MIN_PASS_RATIO = Math.max(0, Math.min(1, Number(process.env.MIN_PASS_RATIO || '0.75')));

interface CardJudgement {
  index: number;
  title: string;
  source: string;
  textLen: number;
  judge: {
    isReal: boolean;
    score: number;
    reasoning: string;
    judgeUsed: string;
  };
}

function summarise(results: CardJudgement[]): string {
  return results
    .map(r => `  #${r.index} [${r.judge.score}/5 ${r.judge.isReal ? 'PASS' : 'FAIL'}] "${r.title.slice(0, 50)}" (${r.source}, ${r.textLen} chars) — ${r.judge.reasoning.slice(0, 140)}`)
    .join('\n');
}

async function attachScreenshot(page: Page, name: string, testInfo: any) {
  try {
    const buf = await page.screenshot({ fullPage: false });
    await testInfo.attach(name, { body: buf, contentType: 'image/png' });
  } catch { /* best-effort */ }
}

test.describe('Content quality @upstream', () => {

  // ───────────────────────────────────────────────────────────────────────
  // 1. Live Feed cards — every card must open with real article content
  // ───────────────────────────────────────────────────────────────────────
  test('Live Feed: every probed card renders a real article in the reader', async ({ page, homePage }, testInfo) => {
    await homePage.goto();
    await expect(homePage.feedCards.first()).toBeVisible({ timeout: 25_000 });

    const total = Math.min(await homePage.feedCards.count(), PROBES_PER_FEED);
    expect(total, 'no feed cards at all').toBeGreaterThan(0);

    const results: CardJudgement[] = [];

    for (let i = 0; i < total; i++) {
      const card = homePage.feedCards.nth(i);
      const title = (await card.locator('h3').innerText().catch(() => '')) || '?';
      const source = (await card.locator('.feed-source-name').innerText().catch(() => '')) || '?';

      await card.scrollIntoViewIfNeeded();
      await card.click();

      const reader = page.locator('#article-modal-reader');
      let body = '';
      try {
        await expect(reader).toHaveClass(/loaded/, { timeout: 15_000 });
        body = (await reader.innerText({ timeout: 8_000 })) || '';
      } catch (e) {
        body = `[reader never loaded: ${String(e).slice(0, 120)}]`;
      }

      const judge = await runArticleQualityJudge(title, source, body);
      results.push({ index: i, title, source, textLen: body.length, judge });

      if (!judge.isReal) {
        await attachScreenshot(page, `live-feed-card-${i}-FAIL.png`, testInfo);
      }

      // Close the modal before the next iteration
      await page.locator('#article-modal-close').click({ trial: false }).catch(() => undefined);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(300);
    }

    const passed = results.filter(r => r.judge.isReal).length;
    const ratio = passed / results.length;
    const failed = results.filter(r => !r.judge.isReal);

    console.log(`[contentQuality] Live Feed verdict: ${passed}/${results.length} pass (ratio ${ratio.toFixed(2)})\n${summarise(results)}`);

    expect(
      ratio,
      `Live Feed content quality below ${(MIN_PASS_RATIO * 100).toFixed(0)}%. Failures:\n${summarise(failed)}`,
    ).toBeGreaterThanOrEqual(MIN_PASS_RATIO);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. LIVE rail items — links resolve + title not empty + LLM judges
  //    that the title/source actually look like a real article headline.
  // ───────────────────────────────────────────────────────────────────────
  test('LIVE rail: every probed item has live URL, non-empty title, and meaningful headline', async ({ page, commonPage, liveRailPage }, testInfo) => {
    await commonPage.goto('/');
    await liveRailPage.openAndWaitForItems(1);

    const items = liveRailPage.items;
    const totalRendered = await items.count();
    expect(totalRendered, 'LIVE rail rendered zero items').toBeGreaterThan(0);

    // Owner contract: cap at 15 UNIQUE items. The track duplicates the
    // item list 2-3× for marquee scrolling, so node count = unique × N.
    const uniqueCount = await items.evaluateAll(els => {
      const seen = new Set<string>();
      els.forEach(e => seen.add(e.getAttribute('href') || ''));
      return seen.size;
    });
    expect(uniqueCount, 'LIVE rail must cap at 15 UNIQUE items per owner contract')
      .toBeLessThanOrEqual(15);

    const total = Math.min(uniqueCount, PROBES_PER_FEED);
    const dead: string[] = [];
    const empty: string[] = [];
    const judged: CardJudgement[] = [];

    for (let i = 0; i < total; i++) {
      const item = items.nth(i);
      const href = (await item.getAttribute('href')) || '';
      const title = (await item.locator('.live-item-title').innerText().catch(() => '')) || '';
      const source = (await item.locator('.live-src').innerText().catch(() => '')) || '';

      if (!title.trim()) {
        empty.push(`#${i} href=${href}`);
        continue;
      }
      if (!/^https?:\/\//i.test(href)) {
        dead.push(`#${i} bad scheme: ${href}`);
        continue;
      }

      // HEAD first; some sites disallow HEAD, fall back to GET.
      let status = 0;
      try {
        const head = await page.request.head(href, { timeout: 8_000, maxRedirects: 5 });
        status = head.status();
        if (status >= 400) {
          const get = await page.request.get(href, { timeout: 10_000, maxRedirects: 5 });
          status = get.status();
        }
      } catch (e) {
        status = -1;
      }
      if (status < 0 || status >= 400) {
        dead.push(`#${i} ${status} ${href} ("${title.slice(0, 60)}")`);
        continue;
      }

      // Headline-mode LLM judge: catches nonsense / placeholder / "Loading…"
      // / "Untitled" / error-text headlines without penalising for being
      // headline-length (no body is expected here by design).
      const judge = await runArticleQualityJudge(title, source, '', 'headline');
      judged.push({ index: i, title, source, textLen: title.length, judge });
    }

    if (dead.length || empty.length) await attachScreenshot(page, 'live-rail-FAIL.png', testInfo);

    const nonsense = judged.filter(j => !j.judge.isReal);

    expect(empty, `LIVE rail items with empty titles:\n${empty.join('\n')}`).toEqual([]);
    expect(dead, `LIVE rail items pointing to dead/non-2xx URLs:\n${dead.join('\n')}`).toEqual([]);
    expect(
      nonsense,
      `LIVE rail items flagged as nonsense / placeholder / error by the LLM judge:\n${summarise(nonsense)}`,
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. YouTube carousel — thumbnails must actually render (no broken images)
  // ───────────────────────────────────────────────────────────────────────
  test('YouTube carousel: every probed thumbnail loads and has a valid YT link', async ({ page, homePage }, testInfo) => {
    await homePage.goto();
    // Wait for at least one yt-card. The site has fallback seed data so this
    // should always succeed; if it doesn't, that's already a finding.
    await homePage.youtubeVideoCards.first().waitFor({ state: 'visible', timeout: 25_000 });

    const total = Math.min(await homePage.youtubeVideoCards.count(), PROBES_PER_FEED);
    expect(total, 'YouTube carousel rendered zero cards').toBeGreaterThan(0);

    const broken: string[] = [];

    for (let i = 0; i < total; i++) {
      const card = homePage.youtubeVideoCards.nth(i);
      await card.scrollIntoViewIfNeeded();

      const img = card.locator('img').first();
      // Poll up to 8s for image to actually load — i.ytimg.com fetch can
      // lag behind the card render by a couple of seconds.
      let imgOk = false;
      try {
        await expect.poll(
          () => img.evaluate((el: HTMLImageElement) =>
            !!el && el.complete && el.naturalWidth > 0 && el.naturalHeight > 0
          ).catch(() => false),
          { timeout: 8_000, intervals: [500, 800, 1500] },
        ).toBe(true);
        imgOk = true;
      } catch {
        imgOk = false;
      }

      const link = await card.getAttribute('href') || await card.locator('a').first().getAttribute('href').catch(() => '') || '';
      const linkOk = /youtu(?:be\.com|\.be)/i.test(link);

      const title = (await card.locator('.yt-title, .yt-card-title').innerText().catch(() => '')) || '?';

      if (!imgOk) broken.push(`#${i} thumbnail not loaded — "${title.slice(0, 60)}"`);
      if (!linkOk) broken.push(`#${i} not a YouTube URL — href=${link}`);
    }

    if (broken.length) await attachScreenshot(page, 'youtube-carousel-FAIL.png', testInfo);

    expect(broken, `YouTube carousel defects:\n${broken.join('\n')}`).toEqual([]);
  });
});
