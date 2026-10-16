export function formatDiscountPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const roundedTenth = Math.round(value * 10) / 10;
  if (Math.abs(roundedTenth - Math.round(roundedTenth)) < 1e-9) {
    return String(Math.round(roundedTenth));
  }
  return roundedTenth.toFixed(1).replace(/\.0$/, '');
}
