import { expect, test } from './fixtures_common';
import { fiveItems, fewerThanFive, nextPage, noneFound } from '../src/utils/scenario_common';

test('find 5 shoes under 220, add them to the cart, and check the total', async ({ shop }) => {
  const urls = await shop.searchItemsByNameUnderPrice(fiveItems.query, fiveItems.maxPrice, fiveItems.limit);

  expect(urls.length).toBe(fiveItems.limit);

  await shop.addItemsToCart(urls);
  await shop.assertCartTotalNotExceeds(fiveItems.maxPrice, urls.length);
});

test('find fewer than 5 items and return only those', async ({ shop }) => {
  const urls = await shop.searchItemsByNameUnderPrice(
    fewerThanFive.query,
    fewerThanFive.maxPrice,
    fewerThanFive.limit,
  );

  expect(urls.length).toBeGreaterThan(0);
  expect(urls.length).toBeLessThan(fewerThanFive.limit);
});

test('find nothing and return an empty list', async ({ shop }) => {
  const urls = await shop.searchItemsByNameUnderPrice(noneFound.query, noneFound.maxPrice, noneFound.limit);

  expect(urls.length).toBe(0);
});

test('open the next results page when the first page has fewer than the limit', async ({ shop }) => {
  const urls = await shop.searchItemsByNameUnderPrice(nextPage.query, nextPage.maxPrice, nextPage.limit);

  expect(shop.pagesOpened).toBeGreaterThan(1);
  expect(urls.length).toBe(nextPage.limit);
});
