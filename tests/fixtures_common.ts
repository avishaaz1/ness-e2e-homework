import { test as base } from '@playwright/test';
import { EbayShop } from '../src/flows/ebay_shop_common';

// Playwright opens the browser. This only builds the shop and opens eBay
// before the test body runs.
export const test = base.extend<{ shop: EbayShop }>({
  shop: async ({ page }, use) => {
    const shop = new EbayShop(page);
    await shop.signIn();
    await use(shop);
  },
});

export { expect } from '@playwright/test';
