import { test as base } from '@playwright/test';
import { AliShop } from '../src/flows/aliexpress_shop_common';

// Playwright opens the browser. This builds the shop and opens AliExpress
// before the test body runs.
export const test = base.extend<{ shop: AliShop }>({
  shop: async ({ page }, use) => {
    const shop = new AliShop(page);
    await shop.open();
    await use(shop);
  },
});

export { expect } from '@playwright/test';
