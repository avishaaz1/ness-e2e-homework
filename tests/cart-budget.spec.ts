import { AliShop } from '../src/flows/aliexpress_shop_common';
import { expect, test } from './fixtures_common';
import { fiveItems, fewerThanFive, nextPage, noneFound } from '../src/utils/scenario_common';

// Every scenario searches AliExpress and keeps items at or under a max price.
// The cart check belongs to the first test: the total must stay within max price × how many items were added.
test.describe('Search items under a max price', () => {
  test('find 5 shoes under 50, add them to the cart, and check the total', async ({ shop }) => {
    const urls = await shop.searchItemsByNameUnderPrice(fiveItems.query, fiveItems.maxPrice, fiveItems.limit);

    expect(
      urls,
      `"${fiveItems.query}" under ${fiveItems.maxPrice} should return ${fiveItems.limit} items`,
    ).toHaveLength(fiveItems.limit);

    await shop.addItemsToCart(urls);
    await shop.assertCartTotalNotExceeds(fiveItems.maxPrice, urls.length);
  });

  test('find fewer than 5 items and return only those', async ({ shop }) => {
    const urls = await shop.searchItemsByNameUnderPrice(
      fewerThanFive.query,
      fewerThanFive.maxPrice,
      fewerThanFive.limit,
    );

    expect(
      urls,
      `"${fewerThanFive.query}" under ${fewerThanFive.maxPrice} should match at least one item`,
    ).not.toHaveLength(0);
    expect(
      urls.length,
      `"${fewerThanFive.query}" under ${fewerThanFive.maxPrice} matched ${urls.length} items, which should be fewer than ${fewerThanFive.limit}: ${urls.join(', ')}`,
    ).toBeLessThan(fewerThanFive.limit);
  });

  test('find nothing and return an empty list', async ({ shop }) => {
    const urls = await shop.searchItemsByNameUnderPrice(noneFound.query, noneFound.maxPrice, noneFound.limit);

    expect(
      urls,
      `"${noneFound.query}" with max price ${noneFound.maxPrice} should match nothing`,
    ).toHaveLength(0);
  });

  test('open the next results page when the first page has fewer than the limit', async ({ page }) => {
    // First navigation is the results page. Opening the homepage first hides Next.
    const shop = new AliShop(page);
    const urls = await shop.searchItemsByNameUnderPrice(nextPage.query, nextPage.maxPrice, nextPage.limit, true);

    expect(
      shop.pagesOpened,
      `"${nextPage.query}" under ${nextPage.maxPrice} should open more than one results page to reach ${nextPage.limit} items`,
    ).toBeGreaterThan(1);
    expect(
      urls.length,
      `after ${shop.pagesOpened} pages, "${nextPage.query}" under ${nextPage.maxPrice} should return more than 5 items`,
    ).toBeGreaterThan(5);
  });
});
