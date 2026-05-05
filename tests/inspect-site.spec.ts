import { test, expect } from '@playwright/test';

// Headless site inspection - run first to discover selectors

test.describe('Inspect alexpavsky.com DOM', () => {
  test('capture homepage structure', async ({ page }) => {
    await page.goto('https://alexpavsky.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({ path: 'test-results/inspect-home.png', fullPage: true });

    // Get all interactive elements
    const elements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, a, input, [role="button"], [data-testid], .profile, .login, .user, .account'));
      return all.map(el => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 100),
        class: el.className?.slice(0, 100),
        id: el.id,
        testid: el.getAttribute('data-testid'),
        href: (el as HTMLAnchoimport { test, expect } from '@playwright/test';

// Headless site inspectioINTERACTIVE ELEMENTS ===');
    console.log(JSON.str
test.describe('Inspect alexpavsky.com DOM', () => {
  test(ed
  test('capture homepage structure', async ({ page      await page.goto('https://alexpavsky.com');
    await Lo    await page.waitForLoadState('networkidle'.t    await page.waitForTimeout(2000);

    // St.
    // Screenshot
   ('logout') ||
      await page.ser
    // Get all isign out') ||
      e.text.toLowerCase().includes('alex') ||
      e.t    const elements = await page.eve'      const all = Array.from(document.querySelent      return all.map(el => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 100),
        class: el.className?de        tag: el.tage.class.toL        text: (el.textCgi        class: el.className?.slice(0, 100),
        id: e          id: el.id,
        testid: el.getAMENTS ===');
    cons        href: (el as HTMLAnchoimport { test, e;

// Headless site inspectioINTERACTIVE ELEMENTS ===');
    console.log(JSON.s) =    console.log(JSON.str
test.describe('Inspect alexsole.log('Has "Alex" text:'  test(ed
  test('capture homepage structure', asyxt  test(' p    await Lo    await page.waitForLoadState('networkidle'.t    await page.waitForTimeout(2000);

 2
    // St.
 =');
    console.log(bodyText);

    expect(true).toBe(true);
  });
});
