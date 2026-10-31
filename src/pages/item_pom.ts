import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT } from '../config/site_common';
import { log } from '../utils/logger_common';
import { dismissPopups, gotoPage } from '../utils/page_common';

// Every selector and label on this page. Change one here and the page object follows.
const ITEM_SELECTORS = {
  addToCartLabel: /הוסיפו לעגלה|add to cart/i,
  cartBadge: 'a[aria-label*="cart" i]',
  choicePromptText: /בחרו|please select/i,
  skuOption: '[class*="sku"] [class*="item"]',
  price: '[class*="price"]',
};

export class ItemPage {
  private readonly addToCartButton: Locator;
  private readonly cartBadge: Locator;
  private readonly choicePrompt: Locator;
  private readonly skuOption: Locator;
  private readonly price: Locator;

  constructor(private readonly page: Page) {
    this.addToCartButton = page.getByRole('button', { name: ITEM_SELECTORS.addToCartLabel });
    this.cartBadge = page.locator(ITEM_SELECTORS.cartBadge);
    this.choicePrompt = page.getByText(ITEM_SELECTORS.choicePromptText);
    this.skuOption = page.locator(ITEM_SELECTORS.skuOption);
    this.price = page.locator(ITEM_SELECTORS.price);
  }

  // Text of the first price on the item page. Empty when none shows up in time.
  async readPriceText(): Promise<string> {
    return this.price.first().innerText({ timeout: 10_000 }).catch(() => '');
  }

  async open(url: string): Promise<void> {
    await gotoPage(this.page, url);
    await dismissPopups(this.page);
    await expect(
      this.addToCartButton.first(),
      `item page should show an add-to-cart button: ${url}`,
    ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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
