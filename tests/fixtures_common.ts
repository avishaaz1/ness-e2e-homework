import { test as base } from '@playwright/test';
import { AliShop } from '../src/flows/aliexpress_shop_common';
import { SauceDemo } from '../src/flows/sauce_demo_common';

// Playwright opens the browser. A fixture builds its flow and opens its site
// before the test body runs. A test only gets the fixtures it asks for,
// so a Sauce Demo test never opens AliExpress.
export const test = base.extend<{ shop: AliShop; sauce: SauceDemo }>({
  shop: async ({ page }, use) => {
    const shop = new AliShop(page);
    await shop.open();
    await use(shop);
  },
  sauce: async ({ page }, use) => {
    const sauce = new SauceDemo(page);
    await sauce.open();
    await use(sauce);
  },
});

export { expect } from '@playwright/test';
