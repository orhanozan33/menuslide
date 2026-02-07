/** Kanada Doları (CAD) - $ sembolü */
const CURRENCY_SYMBOL = '$';

export function formatPrice(price: number | string | null | undefined): string {
  if (price == null || price === '') return '';
  const num = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(num)) return '';
  return `${CURRENCY_SYMBOL}${num.toFixed(2)}`;
}
