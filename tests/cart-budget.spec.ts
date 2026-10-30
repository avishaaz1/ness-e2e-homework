import { expect, test } from './fixtures';
import { EbayShop } from '../src/flows/EbayShop';
import { loadScenario } from '../src/utils/scenario';
import { log } from '../src/utils/logger';

test('find items under a price, add them to the cart, and check the total', async ({ page }) => {
  const scenario = loadScenario();
  log.info(`profile ${process.env.PROFILE || 'demo'}: ${scenario.query}, max ${scenario.maxPrice}, limit ${scenario.limit}`);

  const shop = new EbayShop(page);

  await shop.signIn();

  const urls = await shop.searchItemsByNameUnderPrice(scenario.query, scenario.maxPrice, scenario.limit);
  // the search function may return [] (that is allowed). this scenario should still find something.
  expect(urls.length, 'no items matched the price filter').toBeGreaterThan(0);
  expect(urls.length).toBeLessThanOrEqual(scenario.limit);

  await shop.addItemsToCart(urls);
  await shop.assertCartTotalNotExceeds(scenario.maxPrice, urls.length);
});
