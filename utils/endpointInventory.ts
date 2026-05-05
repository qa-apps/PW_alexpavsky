import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://alexpavsky.com';

const PROBED_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/callback',
  '/api/profile',
  '/api/contact',
  '/api/chat',
  '/api/upload',
  '/api/feed',
  '/api/admin/users',
  '/api/admin/stats',
  '/api/admin/config',
  '/api/documents/doc_123',
  '/api/users/99999/profile',
  '/api/prompt-inspector',
  '/login',
  '/admin',
  '/dashboard',
  '/.well-known/security.txt',
  '/robots.txt',
];

test.describe('Endpoint inventory', () => {
  test('discover which endpoints return non-404', async ({ request }) => {
    const found: string[] = [];
    const missing: string[] = [];

    for (const ep of PROBED_ENDPOINTS) {
      const res = await request.get(`${BASE_URL}${ep}`, { failOnStatusCode: false });
      if (res.status() !== 404) {
        found.push(`${ep} -> ${res.status()}`);
      } else {
        missing.push(ep);
      }
    }

    console.log('\n=== REAL ENDPOINTS ===');
    found.forEach((e) => console.log(e));
    console.log('\n=== MISSING (404) ===');
    missing.forEach((e) => console.log(e));

    expect(found.length + missing.length).toBe(PROBED_ENDPOINTS.length);
  });
});
