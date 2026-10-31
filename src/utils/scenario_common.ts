export type Scenario = {
  query: string;
  maxPrice: number;
  limit: number;
};

// First page already has 5 matches, so Next is not needed.
export const fiveItems: Scenario = {
  query: 'shoes',
  maxPrice: 220,
  limit: 5,
};

// Narrow enough that the exact matches stay under 5. Loose suggestions are ignored.
export const fewerThanFive: Scenario = {
  query: 'purple patent oxford',
  maxPrice: 300,
  limit: 5,
};

// Nothing is priced at 0, so every card is skipped and the result is empty.
export const noneFound: Scenario = {
  query: 'shoes',
  maxPrice: 0,
  limit: 5,
};

// A results page holds 60 cards, so 61 forces a click on Next.
export const nextPage: Scenario = {
  query: 'shoes',
  maxPrice: 220,
  limit: 61,
};
