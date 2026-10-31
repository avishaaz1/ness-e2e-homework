import { type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';
import { log } from '../utils/logger_common';

export class SignInPage {
  private readonly usernameBox: Locator;
  private readonly continueButton: Locator;
  private readonly passwordBox: Locator;
  private readonly captcha: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameBox = page.locator('#userid');
    this.continueButton = page.locator('#signin-continue-btn');
    this.passwordBox = page.locator('#pass');
    this.captcha = page.getByText(/verify|captcha|robot/i);
    this.submitButton = page.locator('#sgnBt');
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.page.goto(site.SIGN_IN, { waitUntil: 'domcontentloaded' });

    await this.usernameBox.waitFor({ state: 'visible', timeout: 15_000 });
    await this.usernameBox.fill(username);
    await this.continueButton.click();

    const which = await Promise.race([
      this.passwordBox.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'password' as const),
      this.captcha.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'captcha' as const),
    ]).catch(() => 'unknown' as const);

    if (which === 'captcha') {
      throw new Error('eBay asked for a captcha during sign-in. Leave the credentials empty and run as a guest.');
    }
    if (which !== 'password') {
      throw new Error('Sign-in did not reach the password step.');
    }

    await this.passwordBox.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('domcontentloaded');

    if (this.page.url().includes(new URL(site.SIGN_IN).host)) {
      throw new Error('Sign-in stayed on the login page. Check the username and password.');
    }

    log.info('signed in');
  }
}
