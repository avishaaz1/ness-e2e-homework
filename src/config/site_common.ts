export const site = {
  HOME: 'https://www.aliexpress.com/',
  CART: 'https://www.aliexpress.com/p/shoppingcart/index.html',
};

// The results URL itself. Opening the homepage first hides the Next control.
export function resultsUrl(query: string, maxPrice: number): string {
  const slug = query.trim().toLowerCase().replace(/\s+/g, '-');
  return `https://he.aliexpress.com/w/wholesale-${slug}.html?maxPrice=${maxPrice}`;
}
