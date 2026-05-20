import { Locator, Page, expect } from '@playwright/test';

export class LiveRailPage {
  readonly page: Page;
  readonly handle: Locator;
  readonly rail: Locator;
  readonly drawer: Locator;
  readonly closeBtn: Locator;
  readonly title: Locator;
  readonly viewport: Locator;
  readonly track: Locator;
  readonly pauseBtn: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.page = page;
    this.handle = page.locator('#liveHandle');
    this.rail = page.locator('#liveRail');
    this.drawer = page.locator('#liveDrawer');
    this.closeBtn = page.locator('#liveClose');
    this.title = page.locator('.live-head .live-title');
    this.viewport = page.locator('.live-viewport');
    this.track = page.locator('#liveTrack');
    this.pauseBtn = page.locator('#livePauseBtn');
    this.items = page.locator('.live-item');
  }

  async open() {
    await this.handle.click();
    await expect(this.rail).toHaveClass(/open/);
    await expect
      .poll(async () => (await this.drawer.boundingBox())?.width ?? 0)
      .toBeGreaterThan(200);
  }

  async openAndWaitForItems(minItems = 1) {
    await this.open();
    await expect.poll(() => this.items.count()).toBeGreaterThanOrEqual(minItems);
    await expect(this.items.first()).toBeVisible();
  }
}
