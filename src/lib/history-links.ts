import type { AccrualRow, AccrualType, PurchaseRow } from "./history-types";

export function findPurchaseById(rows: PurchaseRow[], id: string): PurchaseRow | null {
  return rows.find((row) => row.orderId === id || row.id === id) ?? null;
}

/** Resolve purchase strictly by orderId (scanner deep link). */
export function findPurchaseByOrderId(rows: PurchaseRow[], orderId: string): PurchaseRow | null {
  return rows.find((row) => row.orderId === orderId) ?? null;
}

export function findAccrualById(
  rows: AccrualRow[],
  id: string,
  accrualType?: AccrualType,
): AccrualRow | null {
  if (accrualType) {
    return findAccrualByRef(rows, { id, type: accrualType });
  }
  const matches = rows.filter((row) => row.id === id);
  if (matches.length === 1) {
    return matches[0] ?? null;
  }
  return null;
}

export function findAccrualByRef(
  accruals: AccrualRow[],
  ref: { id: string; type: AccrualType },
): AccrualRow | null {
  return (
    accruals.find((row) => row.id === ref.id && row.accrualType === ref.type && !row.isSelfScan) ??
    null
  );
}

/** Link purchase ↔ accrual only when id and type match confirmed schema links. */
export function findAccrualsForPurchase(
  purchase: PurchaseRow,
  accruals: AccrualRow[],
): AccrualRow[] {
  if (purchase.isSelfScan || purchase.linkedAccruals.length === 0) {
    return [];
  }
  return purchase.linkedAccruals.flatMap((ref) => {
    const row = findAccrualByRef(accruals, ref);
    return row ? [row] : [];
  });
}

/** Fallback when accrual list is already loaded — matches by id + type only. */
export function findPurchaseForAccrual(
  accrual: AccrualRow,
  purchases: PurchaseRow[],
): PurchaseRow | null {
  if (accrual.isSelfScan) {
    return null;
  }
  return (
    purchases.find((row) =>
      row.linkedAccruals.some(
        (ref) => ref.id === accrual.id && ref.type === accrual.accrualType,
      ),
    ) ?? null
  );
}

export function purchaseDetailHref(row: PurchaseRow): string {
  if (row.orderId) {
    return `/history/purchases/${encodeURIComponent(row.orderId)}`;
  }
  if (row.bonusId) {
    return `/history/purchases/${encodeURIComponent(row.bonusId)}`;
  }
  return `/history/purchases/${encodeURIComponent(row.id)}`;
}

export function purchaseOrderNumberLabel(row: PurchaseRow): string | null {
  if (row.orderId) {
    return row.orderId;
  }
  return null;
}
