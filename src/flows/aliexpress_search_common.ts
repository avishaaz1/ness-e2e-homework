import { expect, test, type Page } from '@playwright/test';
import { resultsUrl, withoutQuery } from '../config/site_common';
import { HomePage } from '../pages/home_pom';
import { ItemPage } from '../pages/item_pom';
import { SearchResultsPage } from '../pages/search_results_pom';
import { log } from '../utils/logger_common';
import { gotoPage } from '../utils/page_common';
import { salePrice } from '../utils/price_common';

const MAX_SEARCH_PAGES = 4;

// The search on AliExpress: find items under a price, and go to the next page when the first one is not enough.
export class AliSearchFlow {
  // How many result pages the last search looked at.
  pagesOpened = 0;

  private readonly home: HomePage;
  private readonly results: SearchResultsPage;
  private readonly item: ItemPage;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.results = new SearchResultsPage(page);
    this.item = new ItemPage(page);
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

  private expectKeptPricesAtOrUnder(query: string, maxPrice: number, items: { url: string; price: number }[]): void {
    if (items.length === 0) return;
    const highest = Math.max(...items.map((item) => item.price));
    const list = items.map((item) => `${item.price} ${item.url}`).join('\n');
    expect(
      highest,
      `highest kept price for "${query}" should be <= ${maxPrice}. Kept:\n${list}`,
    ).toBeLessThanOrEqual(maxPrice);
  }
}
