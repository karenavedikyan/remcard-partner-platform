import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  collaborationVisibilityPresentation,
  formatRegistryCount,
  hasPartnershipCounts,
} from "./partnerCollaborationDisplay";
import { catalogStatusLabel, partnerTypeLabel } from "./partnerRegistryDisplay";

/** Initials for prototype-style avatar (first letters of up to two words). */
export function partnerInitials(name: string | null | undefined, fallbackId: string): string {
  const source = (name?.trim() || fallbackId).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "?";
}

export function registrationPillLabel(row: PartnerRegistryItem): string {
  if (row.lifecycle?.projectArchivedAt) return "В архиве";
  return row.registrationLabel === "ACTIVE" ? "Активный" : "Демо";
}

export function registrationPillTone(
  row: PartnerRegistryItem,
): "good" | "neutral" | "archived" {
  if (row.lifecycle?.projectArchivedAt) return "archived";
  return row.registrationLabel === "ACTIVE" ? "good" : "neutral";
}

/** Compact catalog cell: Виден / Скрыт / Нет данных — no fabricated false. */
export function catalogVisibilityToken(row: PartnerRegistryItem): {
  label: string;
  visible: boolean | null;
} {
  if (row.lifecycle?.projectArchivedAt) return { label: "Скрыт", visible: false };
  if (row.lifecycle?.catalogHiddenAt) return { label: "Скрыт", visible: false };
  if (row.catalogVisibility === "VISIBLE") return { label: "Виден", visible: true };
  if (row.catalogVisibility === "HIDDEN" || row.catalogVisibility === "NOT_PUBLISHED" || row.catalogVisibility === "ARCHIVED") {
    return { label: "Скрыт", visible: false };
  }
  if (row.catalogVisibility == null) {
    // Fall back to longer label helper only when enum absent but other signals exist.
    const full = catalogStatusLabel(row);
    if (full === "Виден в каталоге") return { label: "Виден", visible: true };
    if (full === "В архиве" || full === "Скрыт" || full === "Не опубликован") {
      return { label: "Скрыт", visible: false };
    }
    return { label: "Нет данных", visible: null };
  }
  return { label: "Нет данных", visible: null };
}

export function cooperationVisibilityToken(row: PartnerRegistryItem): {
  label: string;
  visible: boolean | null;
} {
  const p = collaborationVisibilityPresentation(row);
  if (p.kind === "missing") return { label: "Нет данных", visible: null };
  return { label: p.kind === "visible" ? "Виден" : "Скрыт", visible: p.kind === "visible" };
}

export function partnershipTotalLabel(row: PartnerRegistryItem): string {
  if (!hasPartnershipCounts(row)) return "Партнёрств: нет данных";
  return `Партнёрств: ${formatRegistryCount(row.partnershipCounts.total)}`;
}

export function partnerIdentitySubtitle(row: PartnerRegistryItem): string {
  const type = partnerTypeLabel(row);
  const city = row.city?.trim() || "—";
  return `${type} · ${city}`;
}

export function partnerPublicIdLine(row: PartnerRegistryItem): string {
  return row.publicId?.trim() || row.id;
}
