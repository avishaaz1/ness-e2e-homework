export const site = {
  HOME: 'https://www.aliexpress.com/',
  CART: 'https://www.aliexpress.com/p/shoppingcart/index.html',
};

// Sauce Demo is a practice shop made for automation. The login tests run on it.
export const sauceSite = {
  HOME: 'https://www.saucedemo.com/',
  INVENTORY: 'https://www.saucedemo.com/inventory.html',
};

// How long a page may take to show its key element.
export const PAGE_READY_TIMEOUT = 20_000;

// The results URL itself. Opening the homepage first hides the Next control.
export function resultsUrl(query: string, maxPrice: number): string {
  const slug = query.trim().toLowerCase().replace(/\s+/g, '-');
  return `https://he.aliexpress.com/w/wholesale-${slug}.html?maxPrice=${maxPrice}`;
}

// The same address without its query string or hash. A relative `url` needs `base`.
export function withoutQuery(url: string, base?: string): string {
  const parsed = new URL(url, base);
  return `${parsed.origin}${parsed.pathname}`;
}
