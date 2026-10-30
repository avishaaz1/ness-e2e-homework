// eBay mixes "ILS 12.42", "US $3.50" and sometimes both for the same amount.
// If ILS is on the line, that is the currency of the price filter on this account.

const ILS = /(?:ILS|₪)\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;
const USD = /(?:US\s*\$|\$)\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;

function grab(text: string, pattern: RegExp): number[] {
  const values: number[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    values.push(Number(match[1].replace(/,/g, '')));
  }
  return values.filter((value) => Number.isFinite(value));
}

// A range like "ILS 12.42 to ILS 31.10" uses the higher number,
// so a random size/color still stays under maxPrice.
export function highestPrice(text: string): number | null {
  const ils = grab(text, ILS);
  const amounts = ils.length > 0 ? ils : grab(text, USD);
  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}
