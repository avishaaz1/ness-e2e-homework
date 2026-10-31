import { type Locator, type Page } from '@playwright/test';
import { log } from '../utils/logger_common';

export class SearchResultsPage {
  private readonly cards: Locator;
  private readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    this.cards = page.locator('a.search-card-item');
    this.nextPage = page.locator('.comet-pagination-next');
  }

  async applyMaxPrice(maxPrice: number): Promise<void> {
    const current = new URL(this.page.url());
    const url = new URL(current.origin + current.pathname);
    url.searchParams.set('maxPrice', String(maxPrice));
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await this.cards.or(this.page.locator('.comet-pagination')).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    log.info(`price filter set, max ${maxPrice}`);
  }

  async offers(): Promise<{ url: string; priceText: string }[]> {
    await this.reveal();
    const rows = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a.search-card-item')).flatMap((card) => {
        const href = card.getAttribute('href') ?? '';
        if (!href.includes('/item/')) return [];
        const priceText = (card.querySelector('[class*="price-sale"]')?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return [{ href, priceText }];
      });
    });

    return rows.map((row) => {
      const absolute = new URL(row.href, this.page.url());
      return { url: `${absolute.origin}${absolute.pathname}`, priceText: row.priceText };
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
    const disabled = await next.evaluate((node) => node.classList.contains('comet-pagination-disabled'));
    if (disabled) return false;

    const before = await this.cards.first().getAttribute('href');
    log.info('clicking next results page');
    await next.locator('button, a').first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.cards.first().waitFor({ state: 'visible', timeout: 20_000 });

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
