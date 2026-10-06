/** Format ruble amounts; preserve kopecks when the API returns fractional values. */
export function formatMoneyRub(value: number): string {
  const hasFraction = Math.abs(value - Math.round(value)) > 1e-9;
  const formatted = hasFraction
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString("ru-RU");
  return `${formatted} ₽`;
}

export function documentOperationsHref(promoCode: string): string {
  return `/history?search=${encodeURIComponent(promoCode)}`;
}
