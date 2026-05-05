import { Locator, Page } from '@playwright/test';
import { CommonPage } from './CommonPage';

export class AuthPage extends CommonPage {
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
  readonly userMenu: Locator;
  readonly userDisplayName: Locator;
  readonly dashboardLink: Locator;
  readonly dashboardOverlay: Locator;
  readonly dashboardUserMeta: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    super(page);
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
    this.userMenu = page.locator('#user-menu');
    this.userDisplayName = page.locator('#user-display-name');
    this.dashboardLink = page.locator('#user-dashboard-link');
    this.dashboardOverlay = page.locator('#user-dashboard-overlay');
    this.dashboardUserMeta = page.locator('#dashboard-user-meta');
    this.logoutLink = page.locator('#user-logout-link');
  }

  async open() {
    await this.goto('/');
    await this.authBtn.click();
  }

  async switchToRegister() {
    await this.registerTab.click();
  }

  async switchToLogin() {
    await this.loginTab.click();
  }

  async submitLogin(email: string, password: string) {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginSubmit.click();
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async openDashboard() {
    await this.openUserMenu();
    await this.dashboardLink.click();
  }

  async logout() {
    await this.openUserMenu();
    await this.logoutLink.click();
  }
}
