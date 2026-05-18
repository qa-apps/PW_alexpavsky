import { test, expect } from '@playwright/test';

/**
 * Security regression tests for /api/article-* endpoints.
 *
 * These endpoints fetch arbitrary URLs server-side, then return HTML to
 * the user's browser. Without guards that's two classic vulnerabilities:
 *
 *   - SSRF: ?url=http://127.0.0.1:5050 → server hits internal pgAdmin
 *     and returns its content to the attacker.
 *   - XSS: external HTML is rendered into the alexpavsky.com origin →
 *     a malicious source can run JS that steals cookies / sessions.
 *
 * Each block here would have failed against the pre-fix server.
 */

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

test.describe('SSRF guard on /api/article-*', () => {
  // URLs the server MUST refuse to fetch. Every entry is a known-bad
  // surface — loopback, link-local cloud metadata, RFC1918 ranges, the
  // raw "localhost" hostname, and non-http schemes.
  const BLOCKED_URLS = [
    'http://127.0.0.1:5050/',
    'http://127.0.0.1/admin',
    'http://localhost/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://[::1]/',
    'file:///etc/passwd',
  ];

  for (const evilUrl of BLOCKED_URLS) {
    test(`article-proxy refuses ${evilUrl}`, async ({ request }) => {
      const r = await request.get(
        `${BASE_URL}/api/article-proxy?url=${encodeURIComponent(evilUrl)}`
      );
      // Either 200 with an error envelope OR 400 (early scheme reject) is fine.
      // What MUST NOT happen: 200 with real content from the internal target.
      expect([200, 400]).toContain(r.status());
      const body = await r.json();
      if (r.status() === 200) {
        expect(body.image, 'must NOT return an image fetched from internal target').toBeNull();
      }
      const hint = JSON.stringify(body).toLowerCase();
      expect(hint).toMatch(/refused|forbidden|invalid|blocked|loopback|private|scheme|not allowed|error|required/);
    });

    test(`article-page refuses ${evilUrl}`, async ({ request }) => {
      const r = await request.get(
        `${BASE_URL}/api/article-page?url=${encodeURIComponent(evilUrl)}`
      );
      const body = await r.text();
      // Either the early scheme-reject HTML (400) or the SSRF guard's
      // "Article preview unavailable" page. Both are safe; the failure
      // mode we're guarding against is leaking content from the target.
      const safe =
        body.includes('Article preview unavailable') ||
        body.includes('Missing or invalid url parameter') ||
        r.status() === 400;
      expect(safe, `unexpected response for ${evilUrl}: ${body.slice(0, 200)}`).toBe(true);
      expect(body.toLowerCase()).not.toContain('pgadmin');
      expect(body).not.toMatch(/ami-id|instance-id|hostname.*ec2/i);
    });
  }
});

test.describe('XSS sanitization on /api/article-page', () => {
  // We can't easily host a malicious-page fixture in CI, so directly
  // assert the rendered output for a real legitimate URL never contains
  // dangerous tags or javascript: URIs. (The sanitizer is unit-tested
  // upstream — this is a defense-in-depth live check.)
  test('rendered reader HTML must not contain dangerous tags or javascript: URIs', async ({ request }) => {
    const target = 'https://dev.to/';
    const r = await request.get(
      `${BASE_URL}/api/article-page?url=${encodeURIComponent(target)}&theme=dark`
    );
    expect(r.status()).toBe(200);
    const full = (await r.text()).toLowerCase();

    // Our wrapper template intentionally embeds a single <style> block for
    // dark/light theming — that's our trusted code. The XSS risk lives in
    // the EXTRACTED article body that comes after the </style> closing tag,
    // before </body>. Slice that section and run the dangerous-token scan
    // only against it.
    const bodyStart = full.indexOf('</style>');
    const bodyEnd = full.lastIndexOf('</body>');
    expect(bodyStart, 'rendered template must contain our theme <style> block').toBeGreaterThan(0);
    expect(bodyEnd).toBeGreaterThan(bodyStart);
    const articleBody = full.slice(bodyStart, bodyEnd);

    for (const bad of [
      '<script',
      '<iframe',
      '<object',
      '<embed',
      '<svg',
      '<form',
      '<style',
      'javascript:',
      'vbscript:',
      'onerror=',
      'onload=',
      'onclick=',
    ]) {
      expect(articleBody, `rendered article body must not contain ${bad}`).not.toContain(bad);
    }
  });

  test('article-page response sets X-Content-Type-Options: nosniff', async ({ request }) => {
    const r = await request.get(
      `${BASE_URL}/api/article-page?url=${encodeURIComponent('https://dev.to/')}&theme=dark`
    );
    // nginx adds its own copy of X-Content-Type-Options, so duplicate
    // headers may concatenate in Playwright's view. Both copies must be
    // "nosniff" — accept either an exact match or any value containing it.
    expect(r.headers()['x-content-type-options'] || '').toContain('nosniff');
  });
});

test.describe('No-default-secret regression', () => {
  test('GET /api/maintenance-ui?access_key=alexpavsky-maint-2026 must not be authenticated', async ({ request }) => {
    // The previous code shipped this string as the hardcoded fallback in
    // chat_server.py. If anyone forgets to set MAINTENANCE_KEY in prod's
    // env, the default could grant unauthorized maintenance access.
    // After the fix, the default is replaced by an ephemeral random key,
    // so the old literal must NEVER unlock the UI.
    const r = await request.get(
      `${BASE_URL}/api/maintenance-ui?access_key=alexpavsky-maint-2026`,
      { maxRedirects: 0 },
    );
    // Either show the login page (200 with the login form) or 302 away —
    // never the authenticated maintenance dashboard with `Maintenance Portal`.
    const body = await r.text();
    expect(body.toLowerCase()).not.toContain('maintenance portal');
  });
});
