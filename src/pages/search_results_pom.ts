import { type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT, withoutQuery } from '../config/site_common';
import { log } from '../utils/logger_common';
import { gotoPage } from '../utils/page_common';

// Every selector on this page. Change one here and the page object follows.
const SEARCH_RESULTS_SELECTORS = {
  card: 'a.search-card-item',
  cardSalePrice: '[class*="price-sale"]',
  pagination: '.comet-pagination',
  nextPage: '.comet-pagination-next',
  nextPageClickable: 'button, a',
  nextPageDisabledClass: 'comet-pagination-disabled',
};

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

  async offers(): Promise<{ url: string; priceText: string }[]> {
    await this.reveal();
    // The browser callback cannot see SEARCH_RESULTS_SELECTORS, so the values go in as arguments.
    const rows = await this.page.evaluate(
      ({ card, salePrice }) => {
        return Array.from(document.querySelectorAll(card)).flatMap((node) => {
          const href = node.getAttribute('href') ?? '';
          if (!href.includes('/item/')) return [];
          const priceText = (node.querySelector(salePrice)?.textContent ?? '').replace(/\s+/g, ' ').trim();
          return [{ href, priceText }];
        });
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
    await this.cards.first().waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT });

    const after = await this.cards.first().getAttribute('href');
    return Boolean(after && after !== before);
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
