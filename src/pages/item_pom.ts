import { expect, type Locator, type Page } from '@playwright/test';
import { log } from '../utils/logger_common';

export class ItemPage {
  private readonly addToCartButton: Locator;
  private readonly cartBadge: Locator;
  private readonly choicePrompt: Locator;
  private readonly skuOption: Locator;

  constructor(private readonly page: Page) {
    this.addToCartButton = page.getByRole('button', { name: /הוסיפו לעגלה|add to cart/i });
    this.cartBadge = page.locator('a[aria-label*="cart" i]');
    this.choicePrompt = page.getByText(/בחרו|please select/i);
    this.skuOption = page.locator('[class*="sku"] [class*="item"]');
  }

  async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.keyboard.press('Escape');
    await expect(
      this.addToCartButton.first(),
      `item page should show an add-to-cart button: ${url}`,
    ).toBeVisible({ timeout: 20_000 });
  }

  async addToCart(): Promise<{ added: boolean; detail: string }> {
    await this.addToCartButton.first().click();

    if (await this.choicePrompt.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (await this.skuOption.first().isVisible().catch(() => false)) await this.skuOption.first().click();
      await this.addToCartButton.first().click();
    }

    await this.cartBadge.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const label = (await this.cartBadge.first().getAttribute('aria-label').catch(() => '')) ?? '';
    const added = /[1-9]/.test(label);
    const detail = added
      ? `cart badge "${label}"`
      : `cart badge did not show a count after add to cart (label: "${label || 'missing'}")`;
    if (!added) log.info(detail);
    return { added, detail };
  }
}
