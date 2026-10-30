import { type Page } from '@playwright/test';
import { log } from '../utils/logger';

export class SignInPage {
  constructor(private readonly page: Page) {}

  async signIn(username: string, password: string): Promise<void> {
    await this.page.goto('https://signin.ebay.com/signin', { waitUntil: 'domcontentloaded' });

    const userBox = this.page.locator('#userid');
    await userBox.waitFor({ state: 'visible', timeout: 15_000 });
    await userBox.fill(username);
    await this.page.locator('#signin-continue-btn').click();

    const passwordBox = this.page.locator('#pass');
    const captcha = this.page.getByText(/verify|captcha|robot/i);
    const which = await Promise.race([
      passwordBox.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'password' as const),
      captcha.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'captcha' as const),
    ]).catch(() => 'unknown' as const);

    if (which === 'captcha') {
      throw new Error('eBay asked for a captcha during sign-in. Leave the credentials empty and run as a guest.');
    }
    if (which !== 'password') {
      throw new Error('Sign-in did not reach the password step.');
    }

    await passwordBox.fill(password);
    await this.page.locator('#sgnBt').click();
    await this.page.waitForLoadState('domcontentloaded');

    if (this.page.url().includes('signin.ebay.com')) {
      throw new Error('Sign-in stayed on the login page. Check the username and password.');
    }

    log.info('signed in');
  }
}
