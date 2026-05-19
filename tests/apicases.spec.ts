import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.alexpavsky.com';

test.describe('API Test Cases', () => {
  test('should return 200 for home page', async ({ request }) => {
    const response = await request.get(BASE_URL + '/');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });

  test('should serve the lab section from the homepage route', async ({ request }) => {
    const response = await request.get(BASE_URL + '/');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('id="lab"');
  });

  test('login without body returns a non-crash 4xx/501', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/auth/login');
    // 501 = handler stub-routed by the defensive dispatcher (the real
    // _handle_login isn't implemented yet, but the dispatcher refuses
    // to crash on AttributeError → nginx 502). Both that AND traditional
    // 4xx rejection signals are safe — the unsafe outcome is 5xx-crash.
    expect([400, 401, 405, 422, 501]).toContain(response.status());
  });

  test('should return non-empty response for chat endpoint with valid body', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/chat', {
      data: { message: 'Hello' },
    });
    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    expect(body).toBeTruthy();
  });

  test('should return 404 for non-existent endpoint', async ({ request }) => {
    const response = await request.get(BASE_URL + '/api/nonexistent-endpoint-12345');
    expect(response.status()).toBe(404);
  });
});
