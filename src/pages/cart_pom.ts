import { expect, type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';
import { highestPrice } from '../utils/price_common';
import { log } from '../utils/logger_common';

export class CartPage {
  private readonly heading: Locator;
  private readonly itemTotal: Locator;
  private readonly subtotal: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Cart', level: 1 });
    this.itemTotal = page.locator('[data-test-id="ITEM_TOTAL"]');
    this.subtotal = page.locator('[data-test-id="SUBTOTAL"]');
  }

  async open(): Promise<void> {
    await this.page.goto(site.CART, { waitUntil: 'domcontentloaded' });
    await expect(this.heading).toBeVisible();
  }

  // ITEM_TOTAL is the merchandise line. SUBTOTAL on eBay includes shipping,
  // and the search filter does not, so the budget check uses the item line.
  async readItemTotal(): Promise<{ amount: number; label: string; raw: string }> {
    let label = 'Item';
    let raw = '';
    if ((await this.itemTotal.count()) > 0) {
      raw = (await this.itemTotal.first().innerText()).trim();
    } else if ((await this.subtotal.count()) > 0) {
      label = 'Subtotal';
      raw = (await this.subtotal.first().innerText()).trim();
    } else {
      throw new Error('Cart total was not on the page. The cart may be empty.');
    }

    const amount = highestPrice(raw);
    if (amount === null) {
      throw new Error(`Could not read a price from the cart line: "${raw}"`);
    }

    if ((await this.subtotal.count()) > 0) {
      log.info(`subtotal line (includes shipping): ${(await this.subtotal.first().innerText()).trim()}`);
    }

    return { amount, label, raw };
  }
}
