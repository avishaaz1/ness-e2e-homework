import { type Page } from '@playwright/test';
import { log } from '../utils/logger';

export class ItemPage {
  constructor(private readonly page: Page) {}

  async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  // size / color live under data-testid="x-msku-evo". The ids next to them change every load.
  async chooseRandomVariants(): Promise<void> {
    const root = this.page.locator('[data-testid="x-msku-evo"]');
    if ((await root.count()) === 0) return;

    const buttons = root.locator('button.listbox-button__control');
    const total = await buttons.count();

    for (let index = 0; index < total; index++) {
      const button = buttons.nth(index);
      if (!(await button.isVisible().catch(() => false))) continue;

      await button.click();
      const options = this.page.locator('[role="listbox"] [role="option"]');
      await options.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);

      const labels = (await options.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
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
      await options.nth(pick.optionIndex).click();
      await this.page.waitForLoadState('domcontentloaded');
    }

    // quantity stays 1. a random quantity would break the per-item budget.
    const qty = this.page.locator('#qtyTextBox');
    if (await qty.isVisible().catch(() => false)) {
      const disabled = await qty.isDisabled().catch(() => true);
      if (!disabled) await qty.fill('1');
    }
  }

  async addToCart(): Promise<boolean> {
    const addToCart = this.page.locator('#atcBtn_btn_1');
    const ready = (await addToCart.count()) > 0 && (await addToCart.isVisible().catch(() => false));
    if (!ready) {
      log.info('no Add to cart on this item, skipping');
      return false;
    }

    // force: the button sits under a sticky header and Playwright keeps waiting for it to stop moving.
    // noWaitAfter: the cart navigation is slow and should not fail the click itself.
    await addToCart.scrollIntoViewIfNeeded().catch(() => undefined);
    await addToCart.click({ force: true, noWaitAfter: true });

    const landedInCart = this.page.waitForURL(/cart\.(ebay|payments\.ebay)\.com/, { timeout: 35_000 });
    const stayedOnItem = this.page.getByText(/see in cart/i).first().waitFor({ timeout: 35_000 });
    await Promise.race([landedInCart, stayedOnItem]).catch(() => undefined);

    const onCart = /cart\.(ebay|payments\.ebay)\.com/.test(this.page.url());
    const seeInCart = await this.page.getByText(/see in cart/i).first().isVisible().catch(() => false);
    return onCart || seeInCart;
  }
}
