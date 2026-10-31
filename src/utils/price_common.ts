const AMOUNT = /(?:ILS|₪)\s*(\d[\d,]*(?:\.\d{1,2})?)/i;

// The sale price is the first amount. The line repeats it, then shows the saving.
export function salePrice(text: string): number | null {
  const match = AMOUNT.exec(text.replace(/\s+/g, ' '));
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}
