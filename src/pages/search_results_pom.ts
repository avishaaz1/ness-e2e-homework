import { type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';
import { log } from '../utils/logger_common';
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
    if (!(await appears(this.maxPriceBox))) {
      log.info('price boxes are not on the page, setting _udhi on the url');
      await this.applyPriceOnUrl(maxPrice);
      await waitVisible(this.cards().first());
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

    await waitVisible(this.cards().first());
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

  async goToNextPage(): Promise<boolean> {
    if (!(await appears(this.nextPage.first(), 5_000))) return false;

    const before = await this.itemUrl(this.cards().first());
    await waitVisible(this.nextPage.first());
    await this.nextPage.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await waitVisible(this.cards().first());

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
