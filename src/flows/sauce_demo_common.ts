import { expect, test, type Page } from '@playwright/test';
import { sauceSite } from '../config/site_common';
import { SauceInventoryPage } from '../pages/sauce_inventory_pom';
import { SauceLoginPage } from '../pages/sauce_login_pom';
import { log } from '../utils/logger_common';
import { gotoPage } from '../utils/page_common';
import type { LoginResult } from './login_result_common';

// The sign in actions on Sauce Demo. Same method names as the AliExpress shop.
export class SauceDemo {
  private readonly loginPage: SauceLoginPage;
  private readonly inventory: SauceInventoryPage;

  constructor(private readonly page: Page) {
    this.loginPage = new SauceLoginPage(page);
    this.inventory = new SauceInventoryPage(page);
  }

  async open(): Promise<void> {
    await this.loginPage.open();
  }

  // Tries to sign in and reports what happened. It never fails on a refused login,
  // so a test can check a wrong password. Run it after open().
  async attemptLogin(username: string, password: string): Promise<LoginResult> {
    return test.step('try to log in', async () => {
      await this.loginPage.enterCredentials(username, password);
      await this.loginPage.submit();

      // Signed in is the product list, not just "no error": the page must really have moved on.
      const signedIn = await this.inventory.isShown(5_000);
      const error = signedIn ? '' : await this.waitForErrorText();
      log.info(`login for ${username}: ${signedIn ? 'signed in' : `refused (${error || 'no error shown'})`}`);
      return { signedIn, error };
    });
  }

  // Signs in and fails the test if it did not work.
  async login(username: string, password: string): Promise<void> {
    await test.step('log in', async () => {
      const { signedIn, error } = await this.attemptLogin(username, password);
      expect(
        signedIn,
        `could not sign in as "${username}". Page errors: ${error || 'none shown'}`,
      ).toBe(true);
    });
  }

  async logout(): Promise<void> {
    await test.step('log out', async () => {
      await this.inventory.logout();
      await this.loginPage.waitUntilShown();
    });
  }

  async isSignedIn(): Promise<boolean> {
    return this.inventory.isShown();
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.loginPage.isShown();
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  // Goes straight to the product page without signing in. The site should refuse and send us back.
  async openProductPageDirectly(): Promise<string> {
    await gotoPage(this.page, sauceSite.INVENTORY);
    await this.loginPage.waitUntilShown();
    return this.loginPage.errorText();
  }

  private async waitForErrorText(): Promise<string> {
    await this.loginPage.waitForError();
    return this.loginPage.errorText();
  }
}
