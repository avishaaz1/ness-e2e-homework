import { expect, test, type Page } from '@playwright/test';
import { HomePage } from '../pages/home_pom';
import { LoginPage } from '../pages/login_pom';
import { Popups } from '../pages/popups_pom';
import { log } from '../utils/logger_common';
import { screenshotPath } from '../utils/screenshot_common';
import type { LoginResult } from './login_result_common';

// A short look for a slider on the home page. It is already there or it is not coming.
const CAPTCHA_ON_HOME_TIMEOUT = 2_000;

// The sign in and sign out actions on AliExpress.
export class AliLoginFlow {
  private popupsHandled = false;

  private readonly home: HomePage;
  private readonly loginPage: LoginPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.loginPage = new LoginPage(page);
  }

  // The popups cover the account menu, so the login steps close them. The cart tests do not
  // need this, and they ran without it, so it is only turned on when a login starts.
  private closePopupsOnce(): void {
    if (this.popupsHandled) return;
    this.popupsHandled = true;
    new Popups(this.page).closeWhenTheyAppear();
  }

  // Tries to sign in and reports what happened. It never fails on a refused login,
  // so tests can check a wrong password. Run it after open() so the home page is showing.
  async attemptLogin(username: string, password: string): Promise<LoginResult> {
    return test.step('try to log in', async () => {
      await this.openSignInDialog();
      await this.loginPage.signIn(username, password);
      await this.loginPage.waitForCaptchaToBeSolved();
      await this.loginPage.waitForOutcome();

      await this.page.screenshot({ path: screenshotPath('login.png') });
      const error = await this.loginPage.errorText();
      // Signed in needs both signs: the form is gone and the account menu offers Sign out.
      const signedIn = !(await this.loginPage.isFormOpen()) && (await this.home.isSignedIn());
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
      await this.home.signOut();
      expect(await this.home.isSignedOut(), 'after Sign out the account menu should offer Sign in again').toBe(true);
    });
  }

  async isSignedIn(): Promise<boolean> {
    return this.home.isSignedIn();
  }

  // Opens the sign in form and stops, so a test can look at the empty form.
  async openSignInForm(): Promise<void> {
    await this.openSignInDialog();
  }

  // AliExpress sometimes puts its slider over the home page before anyone clicks anything.
  // Then the account menu cannot be reached, so a person has to drag it first, as after the password.
  private async openSignInDialog(): Promise<void> {
    this.closePopupsOnce();
    await this.loginPage.waitForCaptchaToBeSolved(CAPTCHA_ON_HOME_TIMEOUT);
    await this.home.openSignIn();
  }

  // True when AliExpress has put its captcha over the page. Then the account menu cannot be reached,
  // and only a person can clear it.
  async isCaptchaCoveringPage(): Promise<boolean> {
    return this.loginPage.isCaptchaShown(CAPTCHA_ON_HOME_TIMEOUT);
  }

  async isContinueEnabled(): Promise<boolean> {
    return this.loginPage.isContinueEnabled();
  }
}
