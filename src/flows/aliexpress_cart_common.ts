import { expect, test, type Page } from '@playwright/test';
import { CartPage } from '../pages/cart_pom';
import { ItemPage } from '../pages/item_pom';
import { log } from '../utils/logger_common';
import { saveScreenshot } from '../utils/screenshot_common';

// The cart on AliExpress: add the found items, then check the total.
export class AliCartFlow {
  private readonly cart: CartPage;

  constructor(private readonly page: Page) {
    this.cart = new CartPage(page);
  }

  async addItemsToCart(urls: string[]): Promise<void> {
    await test.step('add items to cart', async () => {
      let added = 0;
      const notAdded: string[] = [];

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        const number = index + 1;
        // One step per item, so the report shows the item, its link and its screenshot together.
        await test.step(`item ${number}: ${url}`, async () => {
          // Each item opens in its own tab, so the search tab stays where it was. The tab shares
          // the cookies of this test, so every item lands in the same cart.
          const itemTab = await this.page.context().newPage();
          try {
            const item = new ItemPage(itemTab);
            await item.open(url);
            const result = await item.addToCart();
            // The report shows, for every item, what the random choice picked or that none was needed.
            const choices = result.choices.length > 0 ? result.choices.join(' | ') : 'the item asked for no choice';
            test.info().annotations.push({ type: `item ${number} options`, description: choices });
            await saveScreenshot(itemTab, `item-${number}.png`, `item ${number} ${result.added ? 'added' : 'NOT added'}`);
            if (result.added) {
              added += 1;
              log.info(`added item ${number} (${choices}) ${url}`);
            } else {
              notAdded.push(`${url}: ${result.detail}`);
              log.info(`item ${number} not added: ${result.detail}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            notAdded.push(`${url}: ${message}`);
            log.info(`failed item ${number} ${url}: ${message}`);
          } finally {
            // Back to the search tab.
            await itemTab.close();
            await this.page.bringToFront();
          }
        });
      }

      expect(
        added,
        `added ${added} of ${urls.length} items to the cart.${notAdded.length ? `\nNot added:\n${notAdded.join('\n')}` : ''}`,
      ).toBeGreaterThan(0);
      log.info(`added ${added} of ${urls.length}`);
    });
  }

  async assertCartTotalNotExceeds(budgetPerItem: number, itemsCount: number): Promise<void> {
    await test.step('check cart total', async () => {
      const budget = budgetPerItem * itemsCount;
      await this.cart.open();
      const { amount, raw } = await this.cart.readItemTotal();
      log.info(`cart ${raw} (${amount}), budget ${budget}`);
      await saveScreenshot(this.page, 'cart.png', 'cart');
      expect(
        amount,
        `item total on the cart page was "${raw}" (${amount}). Budget is ${budgetPerItem} × ${itemsCount} = ${budget}`,
      ).toBeLessThanOrEqual(budget);
    });
  }
}
