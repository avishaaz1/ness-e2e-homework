import { type Locator, type Page } from '@playwright/test';
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
    await this.addToCartButton.first().waitFor({ state: 'visible', timeout: 20_000 });
  }

  async addToCart(): Promise<boolean> {
    await this.addToCartButton.first().click();

    if (await this.choicePrompt.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (await this.skuOption.first().isVisible().catch(() => false)) await this.skuOption.first().click();
      await this.addToCartButton.first().click();
    }

    await this.cartBadge.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const label = (await this.cartBadge.first().getAttribute('aria-label').catch(() => '')) ?? '';
    const added = /[1-9]/.test(label);
    if (!added) log.info(`cart badge after click: ${label || 'missing'}`);
    return added;
  }
}
