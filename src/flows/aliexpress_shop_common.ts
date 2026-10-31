import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { resultsUrl } from '../config/site_common';
import { CartPage } from '../pages/cart_pom';
import { HomePage } from '../pages/home_pom';
import { ItemPage } from '../pages/item_pom';
import { SearchResultsPage } from '../pages/search_results_pom';
import { log } from '../utils/logger_common';
import { salePrice } from '../utils/price_common';

const SCREENSHOTS = path.resolve('artifacts/screenshots');
const MAX_SEARCH_PAGES = 4;

export class AliShop {
  pagesOpened = 0;

  private readonly home: HomePage;
  private readonly results: SearchResultsPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.results = new SearchResultsPage(page);
  }

  async open(): Promise<void> {
    await this.home.open();
  }

  // Up to `limit` item URLs whose sale price is <= maxPrice. Fewer, including 0, is a valid result.
  async searchItemsByNameUnderPrice(
    query: string,
    maxPrice: number,
    limit = 5,
    direct = false,
  ): Promise<string[]> {
    return test.step(`search "${query}" under ${maxPrice}`, async () => {
      if (direct) {
        await this.page.goto(resultsUrl(query, maxPrice), { waitUntil: 'domcontentloaded' });
        log.info(`opened results directly, max ${maxPrice}`);
      } else {
        await this.home.search(query);
      }

      if (!direct && /\/item\//.test(this.page.url())) {
        this.pagesOpened = 1;
        const priceText = await this.page.locator('[class*="price"]').first().innerText({ timeout: 10_000 }).catch(() => '');
        const price = salePrice(priceText);
        const current = new URL(this.page.url());
        log.info(`opened one item, price ${price ?? 'unknown'}`);
        if (price !== null && price <= maxPrice) return [`${current.origin}${current.pathname}`];
        return [];
      }

      if (!direct) await this.results.applyMaxPrice(maxPrice);

      const urls: string[] = [];
      const seen = new Set<string>();
      this.pagesOpened = 0;

      // Keep going while this page has matches and we still need more items.
      for (let pageNumber = 1; pageNumber <= MAX_SEARCH_PAGES && urls.length < limit; pageNumber++) {
        this.pagesOpened = pageNumber;
        const offers = await this.results.offers();
        log.info(`page ${pageNumber}: ${offers.length} cards, collected ${urls.length}/${limit}`);
        if (offers.length === 0) break;

        for (const offer of offers) {
          if (urls.length >= limit) break;
          const price = salePrice(offer.priceText);
          // Skip cards that are missing, repeated, or above the max price.
          if (!offer.url || seen.has(offer.url) || price === null || price > maxPrice) continue;
          seen.add(offer.url);
          urls.push(offer.url);
          log.info(`keep ${price} ${offer.url}`);
        }

        if (urls.length >= limit) break;
        // Next exists: continue. No Next, or the page did not change: stop and return what we have.
        const moved = await this.results.goToNextPage();
        if (!moved) break;
      }

      return urls;
    });
  }

  async addItemsToCart(urls: string[]): Promise<void> {
    await test.step('add items to cart', async () => {
      fs.mkdirSync(SCREENSHOTS, { recursive: true });
      const itemPage = new ItemPage(this.page);
      let added = 0;

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        try {
          await itemPage.open(url);
          const ok = await itemPage.addToCart();
          const file = path.join(SCREENSHOTS, `item-${index + 1}.png`);
          await this.page.screenshot({ path: file });
          if (ok) {
            added += 1;
            log.info(`added ${url}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log.info(`failed ${url}: ${message}`);
        }
      }

      if (added === 0) throw new Error('None of the items were added to the cart.');
      log.info(`added ${added} of ${urls.length}`);
    });
  }

  async assertCartTotalNotExceeds(budgetPerItem: number, itemsCount: number): Promise<void> {
    await test.step('check cart total', async () => {
      const budget = budgetPerItem * itemsCount;
      const cart = new CartPage(this.page);
      await cart.open();
      const { amount, raw } = await cart.readItemTotal();
      log.info(`cart ${raw} (${amount}), budget ${budget}`);
      fs.mkdirSync(SCREENSHOTS, { recursive: true });
      await this.page.screenshot({ path: path.join(SCREENSHOTS, 'cart.png') });
      expect(amount, `cart ${amount} should be <= ${budget}`).toBeLessThanOrEqual(budget);
    });
  }
}
