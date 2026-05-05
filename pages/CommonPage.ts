import { Locator, Page } from '@playwright/test';

export class CommonPage {
  readonly page: Page;
  readonly html: Locator;
  readonly body: Locator;
  readonly header: Locator;
  readonly main: Locator;
  readonly footer: Locator;
  readonly nav: Locator;
  readonly navLinks: Locator;
  readonly desktopNav: Locator;
  readonly siteLogo: Locator;
  readonly favicon: Locator;
  readonly mobileMenuToggle: Locator;
  readonly mobileNav: Locator;
  readonly mobileNavLinks: Locator;
  readonly headings: Locator;
  readonly lazyImages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.html = page.locator('html');
    this.body = page.locator('body');
    this.header = page.locator('header');
    this.main = page.locator('main');
    this.footer = page.locator('footer, [role="contentinfo"]').first();
    this.nav = page.locator('nav').first();
    this.navLinks = page.locator('nav a');
    this.desktopNav = page.locator('.desktop-nav, nav > ul').first();
    this.siteLogo = page.locator('.nav-brand, .site-logo, [data-testid="site-logo"]').first();
    this.favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]').first();
    this.mobileMenuToggle = page.locator('#nav-menu-btn, .mobile-menu-toggle, [data-testid="mobile-menu"]').first();
    this.mobileNav = page.locator('#mobile-menu, .mobile-nav').first();
    this.mobileNavLinks = page.locator('#mobile-menu a, .mobile-nav a');
    this.headings = page.locator('h1, h2, h3, h4, h5, h6');
    this.lazyImages = page.locator('img[loading="lazy"]');
  }

  async goto(path = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getBodyClass(): Promise<string | null> {
    return await this.body.getAttribute('class');
  }

  async openMobileMenu() {
    await this.mobileMenuToggle.click();
  }

  async getHeadingLevels(): Promise<number[]> {
    const headings = await this.headings.all();
    return Promise.all(headings.map((heading) => heading.evaluate((el) => Number(el.tagName[1]))));
  }

  async hasBodyColors(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return !!(style.color && style.backgroundColor);
    });
  }

  headingIn(section: Locator): Locator {
    return section.locator('h1, h2, h3').first();
  }
}
