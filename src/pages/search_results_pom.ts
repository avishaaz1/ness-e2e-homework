import { type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';
import { log } from '../utils/logger_common';
import { isErrorPage } from '../utils/page_common';
import { appears, waitVisible } from '../utils/wait_common';

const PLACEHOLDER_ITEM = '/itm/123456';

// Stable pieces: aria names on the price boxes, title on the submit button,
// s-card / s-card__link (not the hashed class names on the inner nodes),
// and the next-page link label.
const CARDS_XPATH =
  `//li[contains(@class,'s-card')][.//a[contains(@class,'s-card__link') and contains(@href,'/itm/') and not(contains(@href,'${PLACEHOLDER_ITEM}'))]]`;

export class SearchResultsPage {
  private readonly cardList: Locator;
  private readonly priceRange: Locator;
  private readonly maxPriceBox: Locator;
  private readonly submitPrice: Locator;
  private readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    this.cardList = page.locator(`xpath=${CARDS_XPATH}`);
    this.priceRange = page.locator('.su-textrange__container');
    this.maxPriceBox = this.priceRange.locator('input[type="text"]').nth(1);
    this.submitPrice = this.priceRange.locator('button[title="Submit price range"]');
    this.nextPage = page.locator('a[aria-label="Go to next search page"]');
  }

  cards(): Locator {
    return this.cardList;
  }

  async applyMaxPrice(maxPrice: number): Promise<void> {
    await this.recover();
    if (!(await appears(this.maxPriceBox))) {
      log.info('price boxes are not on the page, setting _udhi on the url');
      await this.applyPriceOnUrl(maxPrice);
      await this.recover();
      await this.waitForCards();
      return;
    }

    await waitVisible(this.maxPriceBox);
    await this.maxPriceBox.scrollIntoViewIfNeeded();
    await this.maxPriceBox.click();
    await this.maxPriceBox.fill('');
    // typing, not just fill(), because the submit button stays disabled until an input event
    await this.maxPriceBox.pressSequentially(String(maxPrice), { delay: 40 });

    if (await this.submitPrice.isEnabled()) {
      await waitVisible(this.submitPrice);
      await this.submitPrice.click();
      await this.page.waitForLoadState('domcontentloaded');
      log.info(`price filter submitted, max ${maxPrice}`);
    } else {
      log.info('price button stayed disabled, setting _udhi on the url');
      await this.applyPriceOnUrl(maxPrice);
    }

    await this.recover();
    await this.waitForCards();
  }

  private async recover(): Promise<void> {
    for (let attempt = 1; attempt <= 3 && (await isErrorPage(this.page)); attempt++) {
      log.info(`results page failed, refreshing (${attempt})`);
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  // An empty result list is valid. Do not fail the search when no cards appear.
  private async waitForCards(): Promise<void> {
    const found = await appears(this.cards().first(), 8_000);
    if (!found) log.info('no result cards on this page');
  }

  private async applyPriceOnUrl(maxPrice: number): Promise<void> {
    const url = new URL(this.page.url());
    url.searchParams.set('_udhi', String(maxPrice));
    url.searchParams.delete('_udlo');
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  }

  async priceText(card: Locator): Promise<string> {
    const row = this.priceRow(card);
    if ((await row.count()) > 0) {
      return (await row.first().innerText()).replace(/\s+/g, ' ').trim();
    }
    const price = this.price(card);
    if ((await price.count()) === 0) return '';
    return (await price.first().innerText()).trim();
  }

  async itemUrl(card: Locator): Promise<string | null> {
    const href = await this.itemLink(card).first().getAttribute('href');
    if (!href || href.includes(PLACEHOLDER_ITEM)) return null;
    const absolute = new URL(href, site.HOME);
    return `${absolute.origin}${absolute.pathname}`;
  }

  // One browser call for the whole page. Reading each card separately is slow enough to hit the test timeout.
  async offers(): Promise<{ url: string; priceText: string }[]> {
    const rows = await this.page.evaluate((placeholder) => {
      const marker = Array.from(document.querySelectorAll('h1, h2, h3, span, div')).find((element) => {
        const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        return text.length < 80 && /matching fewer words/i.test(text);
      });
      return Array.from(document.querySelectorAll('li.s-card')).flatMap((card) => {
        // Cards under "Results matching fewer words" are suggestions, not matches for this search.
        if (marker && marker.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) return [];
        const link = card.querySelector('a.s-card__link');
        const href = link?.getAttribute('href') ?? '';
        if (!href.includes('/itm/') || href.includes(placeholder)) return [];
        const priceText = (card.querySelector('.s-card__price')?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return [{ href, priceText }];
      });
    }, PLACEHOLDER_ITEM);

    return rows.map((row) => {
      const absolute = new URL(row.href, site.HOME);
      return { url: `${absolute.origin}${absolute.pathname}`, priceText: row.priceText };
    });
  }

  async goToNextPage(): Promise<boolean> {
    if (!(await appears(this.nextPage.first(), 5_000))) return false;

    const before = await this.itemUrl(this.cards().first());
    await waitVisible(this.nextPage.first());
    log.info('clicking next results page');
    await this.nextPage.first().click();
    await this.page.waitForLoadState('domcontentloaded');

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (await isErrorPage(this.page)) {
        log.info(`next page failed, refreshing (${attempt})`);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        continue;
      }
      if (await appears(this.cards().first(), 8_000)) break;
    }

    const after = await this.itemUrl(this.cards().first()).catch(() => null);
    return Boolean(after && after !== before);
  }

  private priceRow(card: Locator): Locator {
    return card.locator('.s-card__attribute-row').filter({ has: this.page.locator('.s-card__price') });
  }

  private price(card: Locator): Locator {
    return card.locator('.s-card__price');
  }

  private itemLink(card: Locator): Locator {
    return card.locator('a.s-card__link');
  }
}
