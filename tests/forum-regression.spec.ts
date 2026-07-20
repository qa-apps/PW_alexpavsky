import { test, expect } from '@playwright/test';

type ForumPost = {
  text?: string;
  created_at?: number;
  replies?: ForumPost[];
};

type VisibleForumEntry = {
  text: string;
  createdAt: number;
};

async function readForumEntries(request: any): Promise<VisibleForumEntry[]> {
  const response = await request.get('/api/forum/posts');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  const posts: ForumPost[] = Array.isArray(data.posts) ? data.posts : [];
  return posts
    .flatMap((post: ForumPost) => [
      { text: post.text, createdAt: Number(post.created_at || 0) },
      ...(post.replies || []).map((reply: ForumPost) => ({ text: reply.text, createdAt: Number(reply.created_at || 0) })),
    ])
    .filter((entry): entry is VisibleForumEntry => Boolean(entry.text && entry.text.trim()));
}

async function readForumTexts(request: any): Promise<string[]> {
  return (await readForumEntries(request)).map((entry) => entry.text);
}

test.describe('Forum regressions', () => {
  test('public forum feed must not expose synthetic test tags', async ({ request }) => {
    const visibleText = (await readForumTexts(request)).join('\n');

    expect(visibleText).not.toMatch(/\[tag:[^\]]+\]/i);
  });

  test('public forum feed stays sparse, varied, and avoids bookmark spam', async ({ request }) => {
    const entries = await readForumEntries(request);
    const texts = entries.map((entry) => entry.text);
    const nowSeconds = Date.now() / 1000;
    const recent14d = entries.filter((entry) => entry.createdAt && nowSeconds - entry.createdAt <= 14 * 24 * 60 * 60);
    const recent30d = entries.filter((entry) => entry.createdAt && nowSeconds - entry.createdAt <= 30 * 24 * 60 * 60);

    expect(recent14d.length, 'forum should not receive dense bursts of recent synthetic feedback').toBeLessThanOrEqual(3);
    expect(recent30d.length, 'forum should look like roughly weekly feedback, not daily spam').toBeLessThanOrEqual(6);

    const bookmarkTexts = texts.filter((text) => /bookmar/i.test(text));
    expect(bookmarkTexts, 'bookmark/bookmarked/bookmarking should not dominate public feedback').toEqual([]);

    const duplicates = texts.filter((text, index) => texts.indexOf(text) !== index);
    expect(duplicates, 'public forum feedback should not contain exact duplicate text').toEqual([]);

    const short = texts.filter((text) => text.trim().split(/\s+/).length <= 4).length;
    const medium = texts.filter((text) => {
      const words = text.trim().split(/\s+/).length;
      const sentences = text.split(/[.!?]+/).filter((part) => part.trim()).length;
      return words > 4 && sentences === 1;
    }).length;
    const long = texts.filter((text) => text.split(/[.!?]+/).filter((part) => part.trim()).length >= 2).length;

    expect(short, 'forum should include a few short 2-4 word comments').toBeGreaterThan(0);
    expect(medium, 'forum should include normal one-sentence comments').toBeGreaterThan(0);
    expect(long, 'forum should include longer 2-3 sentence comments').toBeGreaterThan(0);
  });
});
