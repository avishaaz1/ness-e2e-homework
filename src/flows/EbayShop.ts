import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ItemPage } from '../pages/ItemPage';
import { CartPage } from '../pages/CartPage';
import { SignInPage } from '../pages/SignInPage';
import { highestPrice } from '../utils/price';
import { log } from '../utils/logger';

const SCREENSHOTS = path.resolve('artifacts/screenshots');

export class EbayShop {
  private readonly home: HomePage;
  private readonly results: SearchResultsPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.results = new SearchResultsPage(page);
  }

  // הזדהות. בלי משתמש וסיסמה ב-env נשארים כאורח, והסל עדיין עובד.
  async signIn(): Promise<void> {
    await test.step('sign in or continue as guest', async () => {
      const username = process.env.EBAY_USERNAME?.trim();
      const password = process.env.EBAY_PASSWORD?.trim();

      await this.home.open();

      if (!username || !password) {
        log.info('no EBAY_USERNAME / EBAY_PASSWORD, continuing as guest');
        await new CartPage(this.page).clear();
        await this.home.open();
        return;
      }

      await new SignInPage(this.page).signIn(username, password);
      await this.home.open();
    });
  }

  // returns up to `limit` item urls whose price is <= maxPrice
  async searchItemsByNameUnderPrice(query: string, maxPrice: number, limit = 5): Promise<string[]> {
    return test.step(`search "${query}" under ${maxPrice}`, async () => {
      await this.home.search(query);
      await this.results.applyMaxPrice(maxPrice);

      const urls: string[] = [];
      const seen = new Set<string>();
      const maxPages = 6;

      for (let pageNumber = 1; pageNumber <= maxPages && urls.length < limit; pageNumber++) {
        const cards = this.results.cards();
        const count = await cards.count();
        log.info(`page ${pageNumber}: ${count} cards, collected ${urls.length}/${limit}`);

        for (let index = 0; index < count && urls.length < limit; index++) {
          const card = cards.nth(index);
          const url = await this.results.itemUrl(card);
          const priceText = await this.results.priceText(card);
          const price = highestPrice(priceText);
          if (!url || seen.has(url) || price === null || price > maxPrice) continue;

          seen.add(url);
          urls.push(url);
          log.info(`keep ${price} ${url}`);
        }

        if (urls.length >= limit) break;
        const moved = await this.results.goToNextPage();
        if (!moved) break;
      }

      return urls;
    });
  }

  async addItemsToCart(urls: string[]): Promise<void> {
    await test.step('add items to cart', async () => {
      fs.mkdirSync(SCREENSHOTS, { recursive: true });
      let added = 0;

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        const item = await this.page.context().newPage();
        const itemPage = new ItemPage(item);

        try {
          await itemPage.open(url);
          await itemPage.chooseRandomVariants();
          const ok = await itemPage.addToCart();
          const file = path.join(SCREENSHOTS, `item-${index + 1}.png`);
          await item.screenshot({ path: file });
          await test.info().attach(`item-${index + 1}`, { path: file, contentType: 'image/png' });

          if (ok) {
            added += 1;
            log.info(`added ${url}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log.info(`failed ${url}: ${message}`);
          const file = path.join(SCREENSHOTS, `item-${index + 1}-failed.png`);
          await item.screenshot({ path: file }).catch(() => undefined);
        } finally {
          await item.close();
        }
      }

      if (added === 0) {
        throw new Error('None of the items were added to the cart.');
      }

      log.info(`added ${added} of ${urls.length}`);
      // search tab is still this.page, the item tabs are closed
      await this.page.bringToFront();
    });
  }

  async assertCartTotalNotExceeds(budgetPerItem: number, itemsCount: number): Promise<void> {
    await test.step('check cart total', async () => {
      const budget = budgetPerItem * itemsCount;
      const cart = new CartPage(this.page);
      await cart.open();

      const { amount, label, raw } = await cart.readItemTotal();
      log.info(`${label} ${raw} (${amount}) , budget ${budget} (${budgetPerItem} x ${itemsCount})`);

      const file = path.join(SCREENSHOTS, 'cart.png');
      fs.mkdirSync(SCREENSHOTS, { recursive: true });
      await this.page.screenshot({ path: file });
      await test.info().attach('cart', { path: file, contentType: 'image/png' });

      expect(amount, `${label} ${amount} should be <= ${budget}`).toBeLessThanOrEqual(budget);
    });
  }
}
