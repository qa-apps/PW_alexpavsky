/**
 * authForumChain.spec.ts
 *
 * End-to-end chained journey: a brand-new random user registers on the
 * site → goes to the forum → posts a positive feedback message → the
 * message appears in the forum feed.
 *
 * Catches regressions where any single step (register, auth state,
 * forum POST, forum render) breaks. Each link in the chain is asserted
 * along the way so the report points at the precise step that broke.
 */
import { test, expect } from '../utils/fixtures';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

const POSITIVE_MESSAGES = [
  'Nice content, very useful!',
  'Great hub, learned a lot from the red-team docs.',
  'Very interesting take on RAG evaluation, thanks.',
  'Loved the prompt injection scanner — bookmarking it.',
  'Helpful breakdown of LLM observability tools.',
  'Bookmarked. The hallucination analyzer is gold.',
];

function randomUser() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const firstNames = ['Maya', 'Theo', 'Aria', 'Felix', 'Noor', 'Kira', 'Ravi', 'Selma'];
  const lastNames = ['Carter', 'Vasquez', 'Holm', 'Okonkwo', 'Sato', 'Mercer', 'Voss', 'Reed'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return {
    name: `${first} ${last}`,
    email: `qa-chain-${stamp}@alexpavsky.test`,
    password: `Ch4in!-${stamp}`,
    firstName: first,
  };
}

function pickMessage() {
  const base = POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
  // Append a unique stamp so we can locate this exact post in the rendered feed.
  return `${base} [tag:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}]`;
}

test.describe('Auth → forum chain @upstream', () => {

  test('new random user registers, posts positive forum message, sees it in the feed', async ({ page }) => {
    const user = randomUser();
    const message = pickMessage();

    // ── Step 1: register via UI ─────────────────────────────────────────
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const t = document.getElementById('chat-teaser'); if (t) t.remove();
    });

    await page.locator('#auth-btn').click();
    await page.locator('#auth-overlay.open').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.auth-tab[data-tab="register"]').click();
    await page.locator('#register-form').waitFor({ state: 'visible' });

    await page.locator('#reg-name').fill(user.name);
    await page.locator('#reg-email').fill(user.email);
    await page.locator('#reg-password').fill(user.password);
    await page.locator('#reg-password2').fill(user.password);
    await page.locator('#register-form .auth-submit').click();

    await expect(page.locator('#auth-overlay.open')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#user-display-name'), 'nav must show user first name after register')
      .toHaveText(user.firstName, { timeout: 10_000 });

    // ── Step 2: open forum modal & post ─────────────────────────────────
    // The forum is inside a modal launched from a button in the footer
    // (#forum-open-btn). Scroll the trigger into view, click it, wait
    // for the textarea inside the modal.
    const openForumBtn = page.locator('#forum-open-btn');
    await openForumBtn.scrollIntoViewIfNeeded();
    await openForumBtn.click();

    const forumText = page.locator('#forum-text');
    await forumText.waitFor({ state: 'visible', timeout: 10_000 });
    await forumText.fill(message);

    // The "Post" button sits in the same .forum-compose parent.
    const postBtn = page.locator('#forum-submit-btn');
    await postBtn.click();

    // ── Step 3: verify the message appears in the rendered feed ─────────
    // The list re-renders after post; look for the unique stamp inside the
    // post text. The handle (anonymous 4-8 char id) is rendered separately.
    const myPost = page.locator('.forum-post-text, .forum-reply', { hasText: message });
    await expect(myPost.first(), 'newly-posted message must appear in the forum feed')
      .toBeVisible({ timeout: 15_000 });

    // ── Step 4: assert no inline error ──────────────────────────────────
    // forum-status shows "not_implemented" / "Network error" / "Could not
    // post" on failure; "Posted!" or empty on success.
    const status = (await page.locator('#forum-status').innerText().catch(() => '')) || '';
    expect(
      status.toLowerCase(),
      `forum status must indicate success (empty or "Posted!"), got: "${status}"`,
    ).not.toMatch(/not_implemented|network error|could not post|failed|error/);
  });
});
