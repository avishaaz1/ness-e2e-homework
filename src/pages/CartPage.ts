import { expect, type Page } from '@playwright/test';
import { highestPrice } from '../utils/price';
import { log } from '../utils/logger';

export class CartPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('https://cart.ebay.com/', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { name: 'Cart', level: 1 })).toBeVisible();
  }

  // guest carts stick to the Chrome profile, so a second run starts clean.
  // eBay renders two Remove buttons per line and detaches one of them on click.
  async clear(): Promise<void> {
    await this.open();
    for (let guard = 0; guard < 8; guard++) {
      const remove = this.page.locator('button[aria-label^="Remove -"]').first();
      if (!(await remove.isVisible().catch(() => false))) return;
      await remove.click({ force: true, noWaitAfter: true });
      await this.page.waitForTimeout(1_200);
    }
  }

  // ITEM_TOTAL is the merchandise line. SUBTOTAL on eBay includes shipping,
  // and the search filter does not, so the budget check uses the item line.
  async readItemTotal(): Promise<{ amount: number; label: string; raw: string }> {
    const itemTotal = this.page.locator('[data-test-id="ITEM_TOTAL"]');
    const subtotal = this.page.locator('[data-test-id="SUBTOTAL"]');

    let label = 'Item';
    let raw = '';
    if ((await itemTotal.count()) > 0) {
      raw = (await itemTotal.first().innerText()).trim();
    } else if ((await subtotal.count()) > 0) {
      label = 'Subtotal';
      raw = (await subtotal.first().innerText()).trim();
    } else {
      throw new Error('Cart total was not on the page. The cart may be empty.');
    }

    const amount = highestPrice(raw);
    if (amount === null) {
      throw new Error(`Could not read a price from the cart line: "${raw}"`);
    }

    if ((await subtotal.count()) > 0) {
      log.info(`subtotal line (includes shipping): ${(await subtotal.first().innerText()).trim()}`);
    }

    return { amount, label, raw };
  }
}
