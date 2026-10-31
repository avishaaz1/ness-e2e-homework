import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { HomePage } from '../pages/home_pom';
import { SearchResultsPage } from '../pages/search_results_pom';
import { ItemPage } from '../pages/item_pom';
import { CartPage } from '../pages/cart_pom';
import { SignInPage } from '../pages/sign_in_pom';
import { isErrorPage } from '../utils/page_common';
import { highestPrice } from '../utils/price_common';
import { log } from '../utils/logger_common';

const SCREENSHOTS = path.resolve('artifacts/screenshots');
const MAX_SEARCH_PAGES = 6;

export class EbayShop {
  pagesOpened = 0;

  private readonly home: HomePage;
  private readonly results: SearchResultsPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.results = new SearchResultsPage(page);
  }

  // Guest when credentials are missing. Playwright opens a fresh window, so the cart starts empty.
  async signIn(): Promise<void> {
    await test.step('sign in or continue as guest', async () => {
      const username = process.env.EBAY_USERNAME?.trim();
      const password = process.env.EBAY_PASSWORD?.trim();

      await this.home.open();

      if (!username || !password) {
        log.info('no EBAY_USERNAME / EBAY_PASSWORD, continuing as guest');
        return;
      }

      await new SignInPage(this.page).signIn(username, password);
      await this.home.open();
    });
  }

  // Up to `limit` item URLs whose price is <= maxPrice. Fewer, including 0, is a valid result.
  async searchItemsByNameUnderPrice(query: string, maxPrice: number, limit = 5): Promise<string[]> {
    return test.step(`search "${query}" under ${maxPrice}`, async () => {
      await this.home.search(query);
      await this.results.applyMaxPrice(maxPrice);
      const heading = await this.page
        .getByText(/results for/i)
        .first()
        .innerText({ timeout: 3_000 })
        .catch(() => '');
      if (heading) log.info(heading.replace(/\s+/g, ' ').trim());

      const urls: string[] = [];
      const seen = new Set<string>();
      this.pagesOpened = 0;

      // Keep going while this page has matches and we still need more items.
      for (let pageNumber = 1; pageNumber <= MAX_SEARCH_PAGES && urls.length < limit; pageNumber++) {
        this.pagesOpened = pageNumber;
        const offers = await this.results.offers();
        log.info(`page ${pageNumber}: ${offers.length} cards, collected ${urls.length}/${limit}`);
        if (offers.length === 0) {
          if (await isErrorPage(this.page)) {
            throw new Error('eBay showed an error page instead of search results.');
          }
          break;
        }

        for (const offer of offers) {
          if (urls.length >= limit) break;
          const price = highestPrice(offer.priceText);
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
      let added = 0;

      const itemPage = new ItemPage(this.page);

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];

        try {
          await itemPage.open(url);
          await itemPage.chooseRandomVariants();
          const ok = await itemPage.addToCart();
          const file = path.join(SCREENSHOTS, `item-${index + 1}.png`);
          await this.page.screenshot({ path: file });
          await test.info().attach(`item-${index + 1}`, { path: file, contentType: 'image/png' });

          if (ok) {
            added += 1;
            log.info(`added ${url}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log.info(`failed ${url}: ${message}`);
          const file = path.join(SCREENSHOTS, `item-${index + 1}-failed.png`);
          await this.page.screenshot({ path: file }).catch(() => undefined);
        }
      }

      if (added === 0) {
        throw new Error('None of the items were added to the cart.');
      }

      log.info(`added ${added} of ${urls.length}`);
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
