import { accrualDetailHref } from "./accrual-type";
import type { SettlementCompleted, SettlementObligation } from "./settlements-types";

/** Open accrual detail by exact bonus/agentBonus id and type. */
export function settlementAccrualHref(row: SettlementObligation | SettlementCompleted): string {
  return accrualDetailHref(row.id, row.accrualType);
}

/** Purchase detail by exact order id when available. */
export function settlementPurchaseHref(row: SettlementObligation | SettlementCompleted): string {
  return `/history/purchases/${encodeURIComponent(row.orderId)}`;
}
