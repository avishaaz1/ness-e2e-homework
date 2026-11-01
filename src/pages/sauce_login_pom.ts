import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT, sauceSite } from '../config/site_common';
import { gotoPage } from '../utils/page_common';

// Every selector on the Sauce Demo login page.
const SAUCE_LOGIN_SELECTORS = {
  usernameInput: '[data-test="username"]',
  passwordInput: '[data-test="password"]',
  loginButton: '[data-test="login-button"]',
  errorMessage: '[data-test="error"]',
};

export class SauceLoginPage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.locator(SAUCE_LOGIN_SELECTORS.usernameInput);
    this.passwordInput = page.locator(SAUCE_LOGIN_SELECTORS.passwordInput);
    this.loginButton = page.locator(SAUCE_LOGIN_SELECTORS.loginButton);
    this.errorMessage = page.locator(SAUCE_LOGIN_SELECTORS.errorMessage);
  }

  async open(): Promise<void> {
    await gotoPage(this.page, sauceSite.HOME);
    await this.waitUntilShown();
  }

  async waitUntilShown(): Promise<void> {
    await expect(this.loginButton, 'the login page should show the Login button').toBeVisible({
      timeout: PAGE_READY_TIMEOUT,
    });
  }

  // An empty value is typed as an empty field, so the same method covers the blank cases.
  async enterCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.loginButton.click();
  }

  // The login ends in one of two ways: the shop opens, or an error shows on this page.
  async waitForError(): Promise<boolean> {
    return this.errorMessage
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
  }

  async errorText(): Promise<string> {
    return (await this.errorMessage.isVisible()) ? ((await this.errorMessage.innerText()).trim()) : '';
  }

  async isShown(): Promise<boolean> {
    return this.loginButton.isVisible();
  }
}
