export type Scenario = {
  query: string;
  maxPrice: number;
  limit: number;
};

// Shared values. Change one here and every scenario that uses it follows.
export const SEARCH_QUERY = 'shoes';
export const PRODUCT_ID_QUERY = '1005012394007227';
export const MAX_PRICE = 50;
export const HIGH_MAX_PRICE = 80;
export const ZERO_MAX_PRICE = 0;
export const ITEM_LIMIT = 5;
export const LARGE_ITEM_LIMIT = 80;

// The first results page already has more than ITEM_LIMIT matches under this price.
export const fiveItems: Scenario = {
  query: SEARCH_QUERY,
  maxPrice: MAX_PRICE,
  limit: ITEM_LIMIT,
};

// A product id opens that one item. A plain search fills the limit on page 1.
export const fewerThanFive: Scenario = {
  query: PRODUCT_ID_QUERY,
  maxPrice: HIGH_MAX_PRICE,
  limit: ITEM_LIMIT,
};

// A max price of 0 matches nothing, so the result list is empty.
export const noneFound: Scenario = {
  query: SEARCH_QUERY,
  maxPrice: ZERO_MAX_PRICE,
  limit: ITEM_LIMIT,
};

// More than one results page holds, so the run has to open Next.
export const nextPage: Scenario = {
  query: SEARCH_QUERY,
  maxPrice: MAX_PRICE,
  limit: LARGE_ITEM_LIMIT,
};
