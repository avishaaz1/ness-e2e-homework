import { chromium, test as base } from '@playwright/test';
import { LOCALE, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from '../src/config/browser_common';
import { cdpEndpoint, restartChrome, startChrome } from '../src/browser/chrome_common';
import { EbayShop } from '../src/flows/ebay_shop_common';

// Playwright's own Chrome gets eBay's error page, so the test attaches to a
// normal Chrome process. A new context there is an Incognito window: cookies,
// history and the guest cart are dropped when the test closes it.
export const test = base.extend<{ shop: EbayShop }>({
  browser: async ({}, use) => {
    const connect = async () => {
      await startChrome();
      const endpoint = cdpEndpoint();
      if (!endpoint) throw new Error('Chrome debug endpoint is missing.');
      return chromium.connectOverCDP(endpoint, { timeout: 20_000 });
    };

    let browser;
    try {
      browser = await connect();
    } catch {
      await restartChrome();
      browser = await connect();
    }

    await use(browser);
    await browser.close().catch(() => undefined);
  },

  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      locale: LOCALE,
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    });
    await use(context);
    await context.close().catch(() => undefined);
  },

  // Open the Incognito tab before closing the blank startup window. Closing
  // that window first makes Chrome reject the next tab.
  page: async ({ browser, context }, use) => {
    const page = await context.newPage();

    for (const existing of browser.contexts()) {
      if (existing === context) continue;
      for (const open of existing.pages()) {
        await open.close().catch(() => undefined);
      }
    }

    await use(page);
  },

  shop: async ({ page }, use) => {
    const shop = new EbayShop(page);
    await shop.signIn();
    await use(shop);
  },
});

export { expect } from '@playwright/test';
