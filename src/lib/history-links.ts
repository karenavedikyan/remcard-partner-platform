import type { AccrualRow, PurchaseRow } from "./history-types";

export function findPurchaseById(rows: PurchaseRow[], id: string): PurchaseRow | null {
  return rows.find((row) => row.orderId === id || row.id === id) ?? null;
}

/** Resolve purchase strictly by orderId (scanner deep link). */
export function findPurchaseByOrderId(rows: PurchaseRow[], orderId: string): PurchaseRow | null {
  return rows.find((row) => row.orderId === orderId) ?? null;
}

export function findAccrualById(rows: AccrualRow[], id: string): AccrualRow | null {
  return rows.find((row) => row.id === id) ?? null;
}

/** Link purchase ↔ accrual only when bonusId matches accrual.id. */
export function findAccrualsForPurchase(
  purchase: PurchaseRow,
  accruals: AccrualRow[],
): AccrualRow[] {
  if (purchase.isSelfScan || !purchase.bonusId) {
    return [];
  }
  return accruals.filter((row) => !row.isSelfScan && row.id === purchase.bonusId);
}

export function findPurchaseForAccrual(
  accrual: AccrualRow,
  purchases: PurchaseRow[],
): PurchaseRow | null {
  return purchases.find((row) => row.bonusId === accrual.id) ?? null;
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
