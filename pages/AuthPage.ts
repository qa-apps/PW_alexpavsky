import { Locator, Page } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly authBtn: Locator;
  readonly overlay: Locator;
  readonly closeBtn: Locator;
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly loginForm: Locator;
  readonly registerForm: Locator;
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginSubmit: Locator;
  readonly registerName: Locator;
  readonly registerEmail: Locator;
  readonly registerPassword: Locator;
  readonly registerPasswordConfirm: Locator;
  readonly registerSubmit: Locator;
  readonly loginError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.authBtn = page.locator('#auth-btn');
    this.overlay = page.locator('#auth-overlay');
    this.closeBtn = page.locator('#auth-modal-close');
    this.loginTab = page.locator('#auth-overlay button:has-text("Login")').first();
    this.registerTab = page.locator('#auth-overlay button:has-text("Register")').first();
    this.loginForm = page.locator('#login-form');
    this.registerForm = page.locator('#register-form');
    this.loginEmail = page.locator('#login-email');
    this.loginPassword = page.locator('#login-password');
    this.loginSubmit = page.locator('#login-form button[type="submit"], #login-form button:has-text("Login")').first();
    this.registerName = page.locator('#reg-name');
    this.registerEmail = page.locator('#reg-email');
    this.registerPassword = page.locator('#reg-password');
    this.registerPasswordConfirm = page.locator('#reg-password2');
    this.registerSubmit = page.locator('#register-form button[type="submit"], #register-form button:has-text("Create Account")').first();
    this.loginError = page.locator('#login-error');
  }

  async open() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.authBtn.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
  }

  async switchToRegister() {
    await this.registerTab.click();
  }

  async switchToLogin() {
    await this.loginTab.click();
  }
}
