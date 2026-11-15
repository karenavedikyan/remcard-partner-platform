/** Mirror of navigator purchase issuer bonus (frozen discount vs current pool). */
export function issuerBonusPercentFromFrozenDiscount(
  frozenDiscountPercent: number,
  currentPoolPercent: number,
): number {
  const discount = Number.isFinite(frozenDiscountPercent) ? frozenDiscountPercent : 0;
  const pool = Number.isFinite(currentPoolPercent) ? currentPoolPercent : 0;
  const raw = pool - discount;
  if (raw <= 0) return 0;
  return Math.round(raw * 100) / 100;
}