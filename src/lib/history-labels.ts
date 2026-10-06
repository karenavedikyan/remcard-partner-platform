import type { AccrualScope, PurchaseRow } from "./history-types";

export type HistoryStatusTone = "active" | "pending" | "declined" | "neutral";

export const ACCRUAL_SCOPE_LABELS: Record<AccrualScope, string> = {
  earned: "Начислено мне",
  "payable-to-pros": "Вознаграждения профклиентам",
  unknown: "Начисление",
};

export function accrualScopeLabel(scope: AccrualScope): string {
  return ACCRUAL_SCOPE_LABELS[scope];
}

export function purchaseOrderStatusLabel(row: PurchaseRow): string | null {
  if (row.orderStatus) {
    return orderStatusLabel(row.orderStatus);
  }
  return null;
}

export function purchaseOrderStatusTone(row: PurchaseRow): HistoryStatusTone {
  return orderStatusTone(row.orderStatus);
}

/** Label for the primary date field on a purchase row. */
export function purchaseRowDateLabel(row: PurchaseRow): string {
  return row.source === "accepted-bonus" ? "Дата начисления" : "Дата покупки";
}

export const PURCHASE_PERIOD_FILTER_NOTE =
  "Период: для «Принято у меня» и «По рекомендациям» — по дате покупки.";

export const ACCEPTED_BONUS_SOURCE_NOTE =
  "«Принято у меня»: полный список подтверждённых заказов, включая самосканирование и покупки без начисления.";

export const ACCEPTED_BONUS_EMPTY_NOTE =
  "Список пуст — подтверждённых покупок пока нет.";

export const BONUS_STATUS_LABELS: Record<string, string> = {
  CALCULATED: "Начислено",
  CONFIRMED: "Подтверждено",
  AVAILABLE: "Доступно",
  PAID: "Выплачено",
  CANCELLED: "Отменено",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Подтверждена",
  BONUS_CALCULATED: "Бонус рассчитан",
  BONUS_CONFIRMED: "Бонус подтверждён",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  RETURNED: "Возврат",
};

export function bonusStatusLabel(status: string): string {
  return BONUS_STATUS_LABELS[status] ?? status;
}

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "—";
  }
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function bonusStatusTone(status: string): HistoryStatusTone {
  if (status === "PAID") {
    return "active";
  }
  if (status === "CANCELLED") {
    return "declined";
  }
  if (status === "CONFIRMED" || status === "AVAILABLE") {
    return "pending";
  }
  return "neutral";
}

export function orderStatusTone(status: string | null | undefined): HistoryStatusTone {
  if (!status) {
    return "neutral";
  }
  if (status === "COMPLETED" || status === "CONFIRMED") {
    return "active";
  }
  if (status === "CANCELLED" || status === "RETURNED") {
    return "declined";
  }
  return "pending";
}
