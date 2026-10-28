import type {
  PartnerRegistryItem,
  PartnerRegistryPartnershipCounts,
} from "@/lib/prof-admin-partners-api";

export const COLLABORATION_SCOPE_HINT =
  "Показывает, может ли партнёр попадать в общий живой поиск сотрудничества между партнёрами. Фактический список у просматривающего зависит от его фильтров.";

export type CollaborationVisibilityPresentation =
  | { kind: "missing" }
  | { kind: "visible" }
  | { kind: "hidden"; reasonLabel: string };

export function collaborationVisibilityPresentation(
  row: PartnerRegistryItem,
): CollaborationVisibilityPresentation {
  const v = row.partnerSearchVisibility;
  if (v == null || typeof v.visible !== "boolean") {
    return { kind: "missing" };
  }
  if (v.visible) {
    return { kind: "visible" };
  }
  const reasonLabel = typeof v.reasonLabel === "string" && v.reasonLabel.trim() ? v.reasonLabel.trim() : "—";
  return { kind: "hidden", reasonLabel };
}

export function collaborationVisibilityPrimaryLabel(presentation: CollaborationVisibilityPresentation): string {
  if (presentation.kind === "missing") return "Нет данных";
  if (presentation.kind === "visible") return "Виден партнёрам";
  return "Не виден партнёрам";
}

export function formatRegistryCount(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return String(value);
}

export function hasPartnershipCounts(row: PartnerRegistryItem): row is PartnerRegistryItem & {
  partnershipCounts: PartnerRegistryPartnershipCounts;
} {
  return row.partnershipCounts != null && typeof row.partnershipCounts === "object";
}

export type PartnershipCountKey = keyof PartnerRegistryPartnershipCounts;

const COUNT_LABELS: Record<PartnershipCountKey, string> = {
  active: "Активное сотрудничество",
  invited: "Приглашения (не активное сотрудничество)",
  pending: "Ожидают подтверждения",
  paused: "На паузе",
  ended: "Завершённые",
  total: "Всего связей",
};

export function partnershipCountLabel(key: PartnershipCountKey): string {
  return COUNT_LABELS[key];
}

export function partnershipCountsSummary(row: PartnerRegistryItem): {
  active: string;
  total: string;
  hasData: boolean;
} {
  if (!hasPartnershipCounts(row)) {
    return { active: "Нет данных", total: "Нет данных", hasData: false };
  }
  return {
    active: formatRegistryCount(row.partnershipCounts.active),
    total: formatRegistryCount(row.partnershipCounts.total),
    hasData: true,
  };
}

export function partnershipCountsBreakdown(row: PartnerRegistryItem): {
  key: PartnershipCountKey;
  label: string;
  formatted: string;
}[] {
  if (!hasPartnershipCounts(row)) return [];
  const keys: PartnershipCountKey[] = ["active", "invited", "pending", "paused", "ended", "total"];
  return keys.map((key) => ({
    key,
    label: partnershipCountLabel(key),
    formatted: formatRegistryCount(row.partnershipCounts[key]),
  }));
}
