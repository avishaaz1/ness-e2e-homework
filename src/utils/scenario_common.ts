export type Scenario = {
  query: string;
  maxPrice: number;
  limit: number;
};

// The first results page already has more than 5 matches under this price.
export const fiveItems: Scenario = {
  query: 'shoes',
  maxPrice: 50,
  limit: 5,
};

// A product id opens that one item. A plain "shoes" search fills the limit on page 1.
export const fewerThanFive: Scenario = {
  query: '1005012394007227',
  maxPrice: 80,
  limit: 5,
};

// A max price of 0 matches nothing, so the result list is empty.
export const noneFound: Scenario = {
  query: 'shoes',
  maxPrice: 0,
  limit: 5,
};

// More than one results page holds, so the run has to open Next.
export const nextPage: Scenario = {
  query: 'shoes',
  maxPrice: 50,
  limit: 80,
};
