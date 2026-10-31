import { type Locator, type Page } from '@playwright/test';
import { log } from '../utils/logger_common';

const QUANTITY = '1';
const CART_URL = /cart\.(ebay|payments\.ebay)\.com/;

export class ItemPage {
  private readonly variants: Locator;
  private readonly variantButtons: Locator;
  private readonly options: Locator;
  private readonly quantity: Locator;
  private readonly addToCartButton: Locator;
  private readonly seeInCart: Locator;

  constructor(private readonly page: Page) {
    this.variants = page.locator('[data-testid="x-msku-evo"]');
    this.variantButtons = this.variants.locator('button.listbox-button__control');
    this.options = page.locator('[role="listbox"] [role="option"]');
    this.quantity = page.locator('#qtyTextBox');
    this.addToCartButton = page.locator('#atcBtn_btn_1');
    this.seeInCart = page.getByText(/see in cart/i);
  }

  async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  // size / color live under data-testid="x-msku-evo". The ids next to them change every load.
  async chooseRandomVariants(): Promise<void> {
    if ((await this.variants.count()) === 0) return;

    const total = await this.variantButtons.count();

    for (let index = 0; index < total; index++) {
      const button = this.variantButtons.nth(index);
      if (!(await button.isVisible().catch(() => false))) continue;

      await button.click();
      await this.options.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);

      const labels = (await this.options.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
      const usable = labels
        .map((label, optionIndex) => ({ label, optionIndex }))
        .filter((option) => option.label && !/^select(\s+selected)?$/i.test(option.label))
        .filter((option) => !/out of stock|unavailable/i.test(option.label));

      if (usable.length === 0) {
        await this.page.keyboard.press('Escape');
        continue;
      }

      const pick = usable[Math.floor(Math.random() * usable.length)];
      log.info(`variant: ${pick.label}`);
      await this.options.nth(pick.optionIndex).click();
      await this.page.waitForLoadState('domcontentloaded');
    }

    // quantity stays 1. a random quantity would break the per-item budget.
    if (await this.quantity.isVisible().catch(() => false)) {
      const disabled = await this.quantity.isDisabled().catch(() => true);
      if (!disabled) await this.quantity.fill(QUANTITY);
    }
  }

  async addToCart(): Promise<boolean> {
    const ready = (await this.addToCartButton.count()) > 0 && (await this.addToCartButton.isVisible().catch(() => false));
    if (!ready) {
      log.info('no Add to cart on this item, skipping');
      return false;
    }

    // force: the button sits under a sticky header and Playwright keeps waiting for it to stop moving.
    // noWaitAfter: the cart navigation is slow and should not fail the click itself.
    await this.addToCartButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.addToCartButton.click({ force: true, noWaitAfter: true });

    const landedInCart = this.page.waitForURL(CART_URL, { timeout: 35_000 });
    const stayedOnItem = this.seeInCart.first().waitFor({ timeout: 35_000 });
    await Promise.race([landedInCart, stayedOnItem]).catch(() => undefined);

    const onCart = CART_URL.test(this.page.url());
    const seeInCart = await this.seeInCart.first().isVisible().catch(() => false);
    return onCart || seeInCart;
  }
}
