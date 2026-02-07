/** Kanada HST oranı (Ontario 13%). CAD ödemelerinde kullanılır. */
export const CANADA_HST_RATE = 0.13;

/**
 * Tutar vergi dahil değilse (subtotal) HST ekler.
 * @param subtotal Vergi öncesi tutar (amount in payments table)
 * @returns { subtotal, tax, total }
 */
export function addCanadaHST(subtotal: number): { subtotal: number; tax: number; total: number } {
  const tax = Math.round(subtotal * CANADA_HST_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}
