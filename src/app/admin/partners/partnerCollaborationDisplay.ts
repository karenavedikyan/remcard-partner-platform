import type {
  PartnerRegistryItem,
  PartnerRegistryPartnershipCounts,
} from "@/lib/prof-admin-partners-api";
import {
  adminSearchOverrideSettingLabel,
  effectivePartnerSearchPrimaryLabel,
} from "./partnerSearchControl";
import { catalogStatusLabel, denseCatalogStatusToken } from "./partnerRegistryDisplay";

export const COLLABORATION_SCOPE_HINT =
  "Показывает, может ли партнёр попадать в общий живой поиск сотрудничества между партнёрами. Фактический список у просматривающего зависит от его фильтров.";

export type CollaborationVisibilityPresentation =
  | { kind: "missing" }
  | {
      kind: "visible" | "hidden";
      primaryLabel: string;
      adminSettingLabel: string;
      reasonLabel: string | null;
    };

export function collaborationVisibilityPresentation(
  row: PartnerRegistryItem,
): CollaborationVisibilityPresentation {
  const v = row.partnerSearchVisibility;
  if (v == null || typeof v.visible !== "boolean") {
    return { kind: "missing" };
  }
  const adminSettingLabel = adminSearchOverrideSettingLabel(v);
  const primaryLabel = effectivePartnerSearchPrimaryLabel(row) ?? "—";
  const reasonLabel =
    typeof v.reasonLabel === "string" && v.reasonLabel.trim() ? v.reasonLabel.trim() : null;
  return {
    kind: v.visible ? "visible" : "hidden",
    primaryLabel,
    adminSettingLabel,
    reasonLabel,
  };
}

export function collaborationVisibilityPrimaryLabel(presentation: CollaborationVisibilityPresentation): string {
  if (presentation.kind === "missing") return "Нет данных";
  return presentation.primaryLabel;
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

/** Compact mobile row token from effective partner search visibility. */
export function denseSearchStatusToken(row: PartnerRegistryItem): "да" | "нет" | "н/д" {
  const v = row.partnerSearchVisibility;
  if (v == null || typeof v.visible !== "boolean") return "н/д";
  return v.visible ? "да" : "нет";
}

export function densePartnershipCountToken(row: PartnerRegistryItem): string {
  if (!hasPartnershipCounts(row)) return "н/д";
  return formatRegistryCount(row.partnershipCounts.total);
}

export function denseRegistryRowStatusParts(row: PartnerRegistryItem): {
  catalog: "да" | "нет" | "н/д";
  search: "да" | "нет" | "н/д";
  links: string;
  ariaLabel: string;
} {
  const catalog = denseCatalogStatusToken(row);
  const search = denseSearchStatusToken(row);
  const links = densePartnershipCountToken(row);
  const searchLong = collaborationVisibilityPrimaryLabel(collaborationVisibilityPresentation(row));
  const linksLong = links === "н/д" ? "нет данных" : links;
  return {
    catalog,
    search,
    links,
    ariaLabel: `Каталог: ${catalogStatusLabel(row)}. Поиск сотрудничества: ${searchLong}. Связей: ${linksLong}`,
  };
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
