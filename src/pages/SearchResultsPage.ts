import { type Locator, type Page } from '@playwright/test';
import { log } from '../utils/logger';

// Stable pieces: aria names on the price boxes, title on the submit button,
// s-card / s-card__link (not the hashed class names on the inner nodes),
// and the next-page link label.
const CARDS_XPATH =
  "//li[contains(@class,'s-card')][.//a[contains(@class,'s-card__link') and contains(@href,'/itm/') and not(contains(@href,'/itm/123456'))]]";

export class SearchResultsPage {
  constructor(private readonly page: Page) {}

  cards(): Locator {
    return this.page.locator(`xpath=${CARDS_XPATH}`);
  }

  async applyMaxPrice(maxPrice: number): Promise<void> {
    const container = this.page.locator('.su-textrange__container');
    const maxBox = container.locator('input[type="text"]').nth(1);
    const visible = await maxBox.isVisible({ timeout: 8_000 }).catch(() => false);

    if (!visible) {
      log.info('price boxes are not on the page, setting _udhi on the url');
      await this.applyPriceOnUrl(maxPrice);
      return;
    }

    await maxBox.scrollIntoViewIfNeeded();
    await maxBox.click();
    await maxBox.fill('');
    // typing, not just fill(), because the submit button stays disabled until an input event
    await maxBox.pressSequentially(String(maxPrice), { delay: 40 });

    const submit = container.locator('button[title="Submit price range"]');
    if (await submit.isEnabled()) {
      await submit.click();
      await this.page.waitForLoadState('domcontentloaded');
      log.info(`price filter submitted, max ${maxPrice}`);
    } else {
      log.info('price button stayed disabled, setting _udhi on the url');
      await this.applyPriceOnUrl(maxPrice);
    }

    await this.cards().first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  }

  private async applyPriceOnUrl(maxPrice: number): Promise<void> {
    const url = new URL(this.page.url());
    url.searchParams.set('_udhi', String(maxPrice));
    url.searchParams.delete('_udlo');
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  }

  async priceText(card: Locator): Promise<string> {
    const row = card.locator('.s-card__attribute-row').filter({ has: this.page.locator('.s-card__price') });
    if ((await row.count()) > 0) {
      return (await row.first().innerText()).replace(/\s+/g, ' ').trim();
    }
    const price = card.locator('.s-card__price');
    if ((await price.count()) === 0) return '';
    return (await price.first().innerText()).trim();
  }

  async itemUrl(card: Locator): Promise<string | null> {
    const href = await card.locator('a.s-card__link').first().getAttribute('href');
    if (!href || href.includes('/itm/123456')) return null;
    const absolute = new URL(href, 'https://www.ebay.com');
    return `${absolute.origin}${absolute.pathname}`;
  }

  async goToNextPage(): Promise<boolean> {
    const next = this.page.locator('a[aria-label="Go to next search page"]');
    if ((await next.count()) === 0) return false;
    if (!(await next.first().isVisible().catch(() => false))) return false;

    const before = await this.itemUrl(this.cards().first());
    await next.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.cards().first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);

    const after = await this.itemUrl(this.cards().first()).catch(() => null);
    return Boolean(after && after !== before);
  }
}
