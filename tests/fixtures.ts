import { chromium, test as base } from '@playwright/test';
import { cdpEndpoint, restartChrome, startChrome } from '../src/browser/chrome';

// Playwright's own Chrome gets eBay's error page, so the test attaches to a
// normal Chrome process. The cookies live on that window's default context.
export const test = base.extend({
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
    const existing = browser.contexts()[0];
    if (existing) {
      await use(existing);
      return;
    }

    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1366, height: 900 },
    });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
