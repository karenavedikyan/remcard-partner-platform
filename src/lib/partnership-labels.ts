import { canonicalCategoryLabel } from "@/lib/category-display";

export const PARTNERSHIP_STATUS_LABELS: Record<string, string> = {
  INVITED: "Приглашение",
  PENDING: "Согласование",
  ACTIVE: "Активно",
  PAUSED: "Приостановлено",
  ENDED: "Завершено",
};

export const CATALOG_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING: "На проверке",
  NEEDS_REVISION: "Нужно исправить профиль",
  APPROVED: "Проверен",
  REJECTED: "Отклонён",
};

/** @deprecated Prefer displayCategoryLabel(category, storedLabel) at render time. */
export function categoryLabel(key: string): string {
  return canonicalCategoryLabel(key);
}

export function partnershipStatusTone(
  status: string,
): "active" | "pending" | "declined" | "neutral" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "INVITED":
    case "PENDING":
      return "pending";
    case "ENDED":
      return "declined";
    default:
      return "neutral";
  }
}

export function catalogStatusTone(
  status: string,
): "active" | "pending" | "declined" | "neutral" {
  switch (status) {
    case "APPROVED":
      return "active";
    case "PENDING":
      return "pending";
    case "NEEDS_REVISION":
      return "pending";
    case "REJECTED":
      return "declined";
    default:
      return "neutral";
  }
}
