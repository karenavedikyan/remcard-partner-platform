import type { AdminPartnershipStatusFilter, PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import type { PartnershipCountKey } from "./partnerCollaborationDisplay";
import { hasPartnershipCounts } from "./partnerCollaborationDisplay";

export const PARTNERSHIP_STATUS_FILTERS: AdminPartnershipStatusFilter[] = [
  "ALL",
  "ACTIVE",
  "INVITED",
  "PENDING",
  "PAUSED",
  "ENDED",
];

export const COUNT_KEY_TO_STATUS: Record<PartnershipCountKey, AdminPartnershipStatusFilter> = {
  active: "ACTIVE",
  invited: "INVITED",
  pending: "PENDING",
  paused: "PAUSED",
  ended: "ENDED",
  total: "ALL",
};

export function parseAdminPartnershipStatusFilter(raw: string | null | undefined): AdminPartnershipStatusFilter {
  const normalized = (raw ?? "ALL").trim().toUpperCase();
  if (PARTNERSHIP_STATUS_FILTERS.includes(normalized as AdminPartnershipStatusFilter)) {
    return normalized as AdminPartnershipStatusFilter;
  }
  return "ALL";
}

export function adminPartnerPartnershipsDrilldownHref(
  partnerUserId: string,
  status: AdminPartnershipStatusFilter,
  options?: { contextName?: string | null },
): string {
  const qs = new URLSearchParams({ status });
  const name = options?.contextName?.trim();
  if (name) qs.set("contextName", name);
  return `/admin/partners/${encodeURIComponent(partnerUserId)}/partnerships?${qs.toString()}`;
}

export function partnershipCountNumericValue(
  row: PartnerRegistryItem,
  key: PartnershipCountKey,
): number | null {
  if (!hasPartnershipCounts(row)) return null;
  const value = row.partnershipCounts[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function isPartnershipCountDrilldownAvailable(row: PartnerRegistryItem, key: PartnershipCountKey): boolean {
  return partnershipCountNumericValue(row, key) != null;
}

export function adminPartnershipStatusFilterLabel(status: AdminPartnershipStatusFilter): string {
  const labels: Record<AdminPartnershipStatusFilter, string> = {
    ALL: "Все связи",
    ACTIVE: "Активное сотрудничество",
    INVITED: "Приглашения",
    PENDING: "Ожидают подтверждения",
    PAUSED: "На паузе",
    ENDED: "Завершённые",
  };
  return labels[status];
}

export function adminPartnershipRecordStatusLabel(status: string): string {
  const key = status.trim().toUpperCase();
  const map: Record<string, string> = {
    ACTIVE: "Активное",
    INVITED: "Приглашение",
    PENDING: "Ожидание",
    PAUSED: "На паузе",
    ENDED: "Завершено",
  };
  return map[key] ?? status;
}
