import type { SettlementCompleted, SettlementObligation } from "./settlements-types";

/** Open accrual detail by exact bonus/agentBonus id. */
export function settlementAccrualHref(row: SettlementObligation | SettlementCompleted): string {
  return `/history/accruals/${encodeURIComponent(row.id)}`;
}

/** Purchase detail by exact order id when available. */
export function settlementPurchaseHref(row: SettlementObligation | SettlementCompleted): string {
  return `/history/purchases/${encodeURIComponent(row.orderId)}`;
}
