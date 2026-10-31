import { expect, test } from './fixtures_common';
import { scenario } from '../src/utils/scenario_common';
import { log } from '../src/utils/logger_common';

test('find items under a price, add them to the cart, and check the total', async ({ shop }) => {
  log.info(`${scenario.query}, max ${scenario.maxPrice}, limit ${scenario.limit}`);

  const urls = await shop.searchItemsByNameUnderPrice(scenario.query, scenario.maxPrice, scenario.limit);
  console.log(urls);
  console.log(urls.length);
  console.log('--------------------------------');
  // the search function may return [] (that is allowed). this scenario should still find something.
  expect(urls.length, 'no items matched the price filter').toBeGreaterThan(0);
  expect(urls.length).toBeLessThanOrEqual(scenario.limit);

  await shop.addItemsToCart(urls);
  await shop.assertCartTotalNotExceeds(scenario.maxPrice, urls.length);
});
