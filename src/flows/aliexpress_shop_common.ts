import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { resultsUrl, withoutQuery } from '../config/site_common';
import { CartPage } from '../pages/cart_pom';
import { HomePage } from '../pages/home_pom';
import { ItemPage } from '../pages/item_pom';
import { LoginPage } from '../pages/login_pom';
import { Popups } from '../pages/popups_pom';
import { SearchResultsPage } from '../pages/search_results_pom';
import { log } from '../utils/logger_common';
import { gotoPage } from '../utils/page_common';
import { salePrice } from '../utils/price_common';
import type { LoginResult } from './login_result_common';

const SCREENSHOTS = path.resolve('artifacts/screenshots');
const MAX_SEARCH_PAGES = 4;
// A short look for a slider on the home page. It is already there or it is not coming.
const CAPTCHA_ON_HOME_TIMEOUT = 2_000;

export class AliShop {
  pagesOpened = 0;

  private popupsHandled = false;

  private readonly home: HomePage;
  private readonly results: SearchResultsPage;
  private readonly item: ItemPage;
  private readonly cart: CartPage;
  private readonly loginPage: LoginPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.results = new SearchResultsPage(page);
    this.item = new ItemPage(page);
    this.cart = new CartPage(page);
    this.loginPage = new LoginPage(page);
  }

  // The popups cover the account menu, so the login steps close them. The cart tests do not
  // need this, and they ran without it, so it is only turned on when a login starts.
  private closePopupsOnce(): void {
    if (this.popupsHandled) return;
    this.popupsHandled = true;
    new Popups(this.page).closeWhenTheyAppear();
  }

  async open(): Promise<void> {
    await this.home.open();
  }

  // Tries to sign in and reports what happened. It never fails on a refused login,
  // so tests can check a wrong password. Run it after open() so the home page is showing.
  async attemptLogin(username: string, password: string): Promise<LoginResult> {
    return test.step('try to log in', async () => {
      await this.openSignInDialog();
      await this.loginPage.signIn(username, password);
      await this.loginPage.waitForCaptchaToBeSolved();
      await this.loginPage.waitForOutcome();

      await this.page.screenshot({ path: this.screenshotPath('login.png') });
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

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  // Up to `limit` item URLs whose sale price is <= maxPrice. Fewer, including 0, is a valid result.
  async searchItemsByNameUnderPrice(
    query: string,
    maxPrice: number,
    limit: number,
    direct = false,
  ): Promise<string[]> {
    return test.step(`search "${query}" under ${maxPrice}`, async () => {
      if (direct) {
        await gotoPage(this.page, resultsUrl(query, maxPrice));
        log.info(`opened results directly, max ${maxPrice}`);
      } else {
        await this.home.search(query);
      }

      if (!direct && /\/item\//.test(this.page.url())) {
        this.pagesOpened = 1;
        const priceText = await this.item.readPriceText();
        const price = salePrice(priceText);
        const url = withoutQuery(this.page.url());
        log.info(`opened one item, price ${price ?? 'unknown'}`);
        if (price === null) {
          expect(
            price,
            `opened item ${url} but no sale price was readable. Page text: "${priceText || 'empty'}"`,
          ).not.toBeNull();
          return [];
        }
        if (price <= maxPrice) {
          this.expectKeptPricesAtOrUnder(query, maxPrice, [{ url, price }]);
          return [url];
        }
        return [];
      }

      if (!direct) await this.results.applyMaxPrice(maxPrice);

      const kept: { url: string; price: number }[] = [];
      const seen = new Set<string>();
      this.pagesOpened = 0;

      // Keep going while this page has matches and we still need more items.
      for (let pageNumber = 1; pageNumber <= MAX_SEARCH_PAGES && kept.length < limit; pageNumber++) {
        this.pagesOpened = pageNumber;
        const offers = await this.results.offers();
        log.info(`page ${pageNumber}: ${offers.length} cards, collected ${kept.length}/${limit}`);
        if (offers.length === 0) break;

        for (const offer of offers) {
          if (kept.length >= limit) break;
          const price = salePrice(offer.priceText);
          // Skip cards that are missing, repeated, or above the max price.
          if (!offer.url || seen.has(offer.url) || price === null || price > maxPrice) continue;
          seen.add(offer.url);
          kept.push({ url: offer.url, price });
          log.info(`keep ${price} ${offer.url}`);
        }

        if (kept.length >= limit) break;
        // Next exists: continue. No Next, or the page did not change: stop and return what we have.
        const moved = await this.results.goToNextPage();
        if (!moved) break;
      }

      this.expectKeptPricesAtOrUnder(query, maxPrice, kept);
      return kept.map((item) => item.url);
    });
  }

  async addItemsToCart(urls: string[]): Promise<void> {
    await test.step('add items to cart', async () => {
      let added = 0;
      const notAdded: string[] = [];

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        const number = index + 1;
        // One step per item, so the report shows the item, its link and its screenshot together.
        await test.step(`item ${number}: ${url}`, async () => {
          // Each item opens in its own tab, so the search tab stays where it was. The tab shares
          // the cookies of this test, so every item lands in the same cart.
          const itemTab = await this.page.context().newPage();
          try {
            const item = new ItemPage(itemTab);
            await item.open(url);
            const result = await item.addToCart();
            // The report shows, for every item, what the random choice picked or that none was needed.
            const choices = result.choices.length > 0 ? result.choices.join(' | ') : 'the item asked for no choice';
            test.info().annotations.push({ type: `item ${number} options`, description: choices });
            await this.saveScreenshot(itemTab, `item-${number}.png`, `item ${number} ${result.added ? 'added' : 'NOT added'}`);
            if (result.added) {
              added += 1;
              log.info(`added item ${number} (${choices}) ${url}`);
            } else {
              notAdded.push(`${url}: ${result.detail}`);
              log.info(`item ${number} not added: ${result.detail}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            notAdded.push(`${url}: ${message}`);
            log.info(`failed item ${number} ${url}: ${message}`);
          } finally {
            // Back to the search tab.
            await itemTab.close();
            await this.page.bringToFront();
          }
        });
      }

      expect(
        added,
        `added ${added} of ${urls.length} items to the cart.${notAdded.length ? `\nNot added:\n${notAdded.join('\n')}` : ''}`,
      ).toBeGreaterThan(0);
      log.info(`added ${added} of ${urls.length}`);
    });
  }

  private screenshotPath(name: string): string {
    fs.mkdirSync(SCREENSHOTS, { recursive: true });
    return path.join(SCREENSHOTS, name);
  }

  // Saves the screenshot in artifacts/screenshots and attaches the same picture to the report.
  private async saveScreenshot(page: Page, fileName: string, label: string): Promise<void> {
    const file = this.screenshotPath(fileName);
    await page.screenshot({ path: file });
    await test.info().attach(label, { path: file, contentType: 'image/png' });
  }

  private expectKeptPricesAtOrUnder(query: string, maxPrice: number, items: { url: string; price: number }[]): void {
    if (items.length === 0) return;
    const highest = Math.max(...items.map((item) => item.price));
    const list = items.map((item) => `${item.price} ${item.url}`).join('\n');
    expect(
      highest,
      `highest kept price for "${query}" should be <= ${maxPrice}. Kept:\n${list}`,
    ).toBeLessThanOrEqual(maxPrice);
  }

  async assertCartTotalNotExceeds(budgetPerItem: number, itemsCount: number): Promise<void> {
    await test.step('check cart total', async () => {
      const budget = budgetPerItem * itemsCount;
      await this.cart.open();
      const { amount, raw } = await this.cart.readItemTotal();
      log.info(`cart ${raw} (${amount}), budget ${budget}`);
      await this.saveScreenshot(this.page, 'cart.png', 'cart');
      expect(
        amount,
        `item total on the cart page was "${raw}" (${amount}). Budget is ${budgetPerItem} × ${itemsCount} = ${budget}`,
      ).toBeLessThanOrEqual(budget);
    });
  }
}
