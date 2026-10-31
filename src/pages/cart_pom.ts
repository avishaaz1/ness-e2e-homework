import { expect, type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';
import { salePrice } from '../utils/price_common';

export class CartPage {
  private readonly linePrices: Locator;

  constructor(private readonly page: Page) {
    this.linePrices = page.locator('.cart-product-price-buynow');
  }

  async open(): Promise<void> {
    await this.page.goto(site.CART, { waitUntil: 'domcontentloaded' });
    await this.page.keyboard.press('Escape');
    // Line prices, not the summary. The summary stays 0 until a checkbox is ticked.
    await expect(
      this.linePrices.first(),
      'cart should show at least one item price. The summary stays 0 until a line is selected, so the check uses the line prices.',
    ).toBeVisible({ timeout: 20_000 });
  }

  async readItemTotal(): Promise<{ amount: number; raw: string }> {
    const texts = (await this.linePrices.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
    const amounts = texts.map((text) => salePrice(text)).filter((value): value is number => value !== null);
    expect(
      amounts,
      `cart line prices should include a number. The page showed: ${texts.join(' | ') || 'no price text'}`,
    ).not.toHaveLength(0);
    const amount = amounts.reduce((sum, value) => sum + value, 0);
    return { amount, raw: texts.join(' + ') };
  }
}
