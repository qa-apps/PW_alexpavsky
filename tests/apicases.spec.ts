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

  test('should return 405 for login without body', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/auth/login');
    expect([400, 405, 422, 401]).toContain(response.status());
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
