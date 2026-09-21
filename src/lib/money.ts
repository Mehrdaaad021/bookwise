// src/lib/money.ts
/** Prices are stored as integer fils to avoid float rounding errors. */
export function formatFils(fils: number, currency = "AED"): string {
  const amount = fils / 100;
  const formatted = amount.toFixed(2).replace(/\.?0+$/, "");
  return `${currency} ${formatted}`;
}

export function aedToFils(aed: number): number {
  return Math.round(aed * 100);
}