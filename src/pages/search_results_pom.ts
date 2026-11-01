import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT, withoutQuery } from '../config/site_common';
import { log } from '../utils/logger_common';
import { gotoPage } from '../utils/page_common';

// Every selector on this page. Change one here and the page object follows.
// The result cards and their prices are found with XPath, as the task asks.
// A class is matched as a whole word, so "search-card-item-x" is not a card.
const SEARCH_RESULTS_SELECTORS = {
  card: "//a[contains(concat(' ', normalize-space(@class), ' '), ' search-card-item ')]",
  // Relative to one card.
  cardSalePrice: ".//*[contains(@class, 'price-sale')]",
  pagination: '.comet-pagination',
  nextPage: '.comet-pagination-next',
  nextPageClickable: 'button, a',
  nextPageDisabledClass: 'comet-pagination-disabled',
};

const READ_ATTEMPTS = 3;

export class SearchResultsPage {
  private readonly cards: Locator;
  private readonly pagination: Locator;
  private readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    this.cards = page.locator(SEARCH_RESULTS_SELECTORS.card);
    this.pagination = page.locator(SEARCH_RESULTS_SELECTORS.pagination);
    this.nextPage = page.locator(SEARCH_RESULTS_SELECTORS.nextPage);
  }

  async applyMaxPrice(maxPrice: number): Promise<void> {
    const url = new URL(withoutQuery(this.page.url()));
    url.searchParams.set('maxPrice', String(maxPrice));
    await gotoPage(this.page, url.toString());
    await this.cards.or(this.pagination).first().waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT }).catch(() => undefined);
    log.info(`price filter set, max ${maxPrice}`);
  }

  // The page can reload itself while it is being read, for example right after the price filter is set.
  // That destroys the page the read was running in, so the read starts again on the new page.
  async offers(): Promise<{ url: string; priceText: string }[]> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.readOffers();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= READ_ATTEMPTS || !/context was destroyed|navigation/i.test(message)) throw error;
        log.info(`results page reloaded while reading, reading again (attempt ${attempt + 1})`);
        await this.page.waitForLoadState('domcontentloaded');
      }
    }
  }

  private async readOffers(): Promise<{ url: string; priceText: string }[]> {
    await this.reveal();
    // The browser callback cannot see SEARCH_RESULTS_SELECTORS, so the values go in as arguments.
    const rows = await this.page.evaluate(
      ({ card, salePrice }) => {
        const cards = document.evaluate(card, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const rows: { href: string; priceText: string }[] = [];
        for (let index = 0; index < cards.snapshotLength; index++) {
          const node = cards.snapshotItem(index) as Element;
          const href = node.getAttribute('href') ?? '';
          if (!href.includes('/item/')) continue;
          const price = document.evaluate(salePrice, node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          rows.push({ href, priceText: (price?.textContent ?? '').replace(/\s+/g, ' ').trim() });
        }
        return rows;
      },
      { card: SEARCH_RESULTS_SELECTORS.card, salePrice: SEARCH_RESULTS_SELECTORS.cardSalePrice },
    );

    return rows.map((row) => {
      return { url: withoutQuery(row.href, this.page.url()), priceText: row.priceText };
    });
  }

  async goToNextPage(): Promise<boolean> {
    let count = 0;
    for (let attempt = 1; attempt <= 8 && count === 0; attempt++) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(1000);
      count = await this.nextPage.count();
      log.info(`next controls ${count} attempt ${attempt}`);
    }
    if (count === 0) return false;

    const next = this.nextPage.last();
    await next.scrollIntoViewIfNeeded().catch(() => undefined);
    if (!(await next.isVisible({ timeout: 8_000 }).catch(() => false))) return false;
    const disabled = await next.evaluate(
      (node, disabledClass) => node.classList.contains(disabledClass),
      SEARCH_RESULTS_SELECTORS.nextPageDisabledClass,
    );
    if (disabled) return false;

    const before = await this.cards.first().getAttribute('href');
    log.info('clicking next results page');
    await next.locator(SEARCH_RESULTS_SELECTORS.nextPageClickable).first().click();
    await this.page.waitForLoadState('domcontentloaded');

    // The old cards stay on screen while the next page loads. The page has moved on only when the
    // first card is a different one, so wait for that instead of reading it once.
    return expect
      .poll(async () => this.cards.first().getAttribute('href').catch(() => before), {
        message: 'the first result should change after clicking Next',
        timeout: PAGE_READY_TIMEOUT,
      })
      .not.toBe(before)
      .then(() => true)
      .catch(() => false);
  }

  // Cards and the page numbers sit below the first screen.
  private async reveal(): Promise<void> {
    await this.page.evaluate(async () => {
      for (let step = 0; step < 4; step++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    });
  }
}
