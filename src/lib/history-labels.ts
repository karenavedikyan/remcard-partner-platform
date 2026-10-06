export type HistoryStatusTone = "active" | "pending" | "declined" | "neutral";

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
