import {
  matchesListPartnerType,
  matchesListSpecialization,
  matchesListStage,
  partnerDisplayTitle,
  partnershipPartnerUser,
  sortPartnershipsDeterministic,
  type AgentPartnerTypeFilter,
  type PartnershipPartnerProfile,
} from "@/lib/agent-r04/partner-filters";
import { PARTNERSHIP_STATUS_LABELS } from "@/lib/partnership-labels";
import type { Partnership } from "@/lib/types";

export type ActiveListStatusFilter = "" | "ACTIVE" | "PAUSED";
export type ActiveListSort = "updated_desc" | "name_asc" | "status";
export type ActiveListArchiveView = "active" | "archive" | "hidden";

export type ActiveListTaxonomyLabels = {
  products: Record<string, string>;
  services: Record<string, string>;
  stages: Record<string, string>;
};

export const ACTIVE_PARTNER_TYPE_LABELS: Record<Exclude<AgentPartnerTypeFilter, "">, string> = {
  agent: "Агент",
  specialist: "Специалист",
  store: "Магазин",
  company: "Компания",
};

/** trim + collapse whitespace + ru lowercase + ё→е — same for needle and haystack. */
export function normalizePartnerSearchText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е");
}

export function cityIdentityKey(city: string): string {
  return normalizePartnerSearchText(city);
}

/**
 * Unique cities from the full available collection for the current visibility bucket
 * (before type/spec/city/stage/status/search). Dedupes by normalized identity.
 */
export function collectActiveListCityOptions(
  partnerships: Partnership[],
  meId: string,
): string[] {
  const byKey = new Map<string, string>();
  for (const p of partnerships) {
    const raw = partnershipPartnerUser(p, meId).city?.trim();
    if (!raw) continue;
    const key = cityIdentityKey(raw);
    if (!byKey.has(key)) byKey.set(key, raw);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

/**
 * One <option> per normalized city identity when merging collection options with a
 * retained selected value (e.g. visibility switch active→archive with ё/е spelling).
 * Selected spelling wins so native <select value> stays non-empty; unknown selected
 * cities are preserved.
 */
export function mergeCitySelectOptions(cityOptions: string[], selectedCity: string): string[] {
  const byKey = new Map<string, string>();
  for (const city of cityOptions) {
    const raw = city.trim();
    if (!raw) continue;
    const key = cityIdentityKey(raw);
    if (!byKey.has(key)) byKey.set(key, raw);
  }
  const selected = selectedCity.trim();
  if (selected) {
    byKey.set(cityIdentityKey(selected), selected);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

function resolveSpecializationLabel(
  specialization: string,
  taxonomy: ActiveListTaxonomyLabels | null | undefined,
): string | null {
  if (!specialization) return null;
  const [group, id] = specialization.split(":");
  if (!id) return null;
  if (!taxonomy) return null;
  if (group === "products") return taxonomy.products[id] ?? null;
  if (group === "services") return taxonomy.services[id] ?? null;
  return null;
}

function resolveStageLabel(
  stageId: string,
  taxonomy: ActiveListTaxonomyLabels | null | undefined,
): string | null {
  if (!stageId || !taxonomy) return null;
  return taxonomy.stages[stageId] ?? null;
}

function partnerDirectionLabels(
  partner: PartnershipPartnerProfile,
  taxonomy: ActiveListTaxonomyLabels | null | undefined,
): string[] {
  if (!taxonomy) return [];
  const labels: string[] = [];
  const products = partner.workingProductCategoryIds?.length
    ? partner.workingProductCategoryIds
    : partner.storeCategories;
  const services = partner.workingServiceSpecializationIds?.length
    ? partner.workingServiceSpecializationIds
    : partner.specializations;
  const stages = partner.workingNavigatorStageIds ?? [];
  for (const id of products) {
    const label = taxonomy.products[id];
    if (label) labels.push(label);
  }
  for (const id of services) {
    const label = taxonomy.services[id];
    if (label) labels.push(label);
  }
  for (const id of stages) {
    const label = taxonomy.stages[id];
    if (label) labels.push(label);
  }
  return labels;
}

export function matchesActivePartnerSearch(
  partnership: Partnership,
  meId: string,
  query: string,
  taxonomy?: ActiveListTaxonomyLabels | null,
): boolean {
  const needle = normalizePartnerSearchText(query);
  if (!needle) return true;
  const titles = partnerDisplayTitle(partnership, meId);
  const partner = partnershipPartnerUser(partnership, meId);
  const parts = [
    titles.official,
    titles.alias ?? "",
    partner.displayName ?? "",
    partner.organizationName ?? "",
    partner.city ?? "",
    (partner as PartnershipPartnerProfile & { publicId?: string | null }).publicId ?? "",
    ...partnerDirectionLabels(partner, taxonomy),
  ];
  const haystack = normalizePartnerSearchText(parts.filter(Boolean).join(" "));
  return haystack.includes(needle);
}

export function matchesActivePartnerCity(
  partner: PartnershipPartnerProfile,
  city: string,
): boolean {
  const wanted = normalizePartnerSearchText(city);
  if (!wanted) return true;
  return cityIdentityKey(partner.city ?? "") === wanted;
}

export function matchesActivePartnerStatus(
  partnership: Partnership,
  status: ActiveListStatusFilter,
): boolean {
  if (!status) return true;
  return partnership.status === status;
}

export type ActiveListRestrictionInput = {
  partnerType: AgentPartnerTypeFilter;
  specialization: string;
  city: string;
  stageId: string;
  status: ActiveListStatusFilter;
  archiveView: ActiveListArchiveView;
};

/** Each restriction once: type/spec/city/stage/status + archive/hidden if not active. Search/sort excluded. */
export function countActiveListRestrictions(input: ActiveListRestrictionInput): number {
  let n = 0;
  if (input.partnerType) n += 1;
  if (input.specialization) n += 1;
  if (input.city.trim()) n += 1;
  if (input.stageId) n += 1;
  if (input.status) n += 1;
  if (input.archiveView !== "active") n += 1;
  return n;
}

export function displayedPartnerSortName(partnership: Partnership, meId: string): string {
  const titles = partnerDisplayTitle(partnership, meId);
  return titles.alias ?? titles.official;
}

export function partnershipStatusSortLabel(status: string): string {
  return PARTNERSHIP_STATUS_LABELS[status] ?? status;
}

export function sortActivePartnerships(
  rows: Partnership[],
  sort: ActiveListSort,
  meId: string,
): Partnership[] {
  if (sort === "name_asc") {
    return [...rows].sort((a, b) => {
      const byName = displayedPartnerSortName(a, meId).localeCompare(
        displayedPartnerSortName(b, meId),
        "ru",
      );
      if (byName !== 0) return byName;
      const byTime = b.updatedAt.localeCompare(a.updatedAt);
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  }
  if (sort === "status") {
    return [...rows].sort((a, b) => {
      const byStatus = partnershipStatusSortLabel(a.status).localeCompare(
        partnershipStatusSortLabel(b.status),
        "ru",
      );
      if (byStatus !== 0) return byStatus;
      const byTime = b.updatedAt.localeCompare(a.updatedAt);
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  }
  return sortPartnershipsDeterministic(rows);
}

export function filterActivePartnershipRows(
  rows: Partnership[],
  meId: string,
  opts: {
    searchQuery: string;
    partnerType: AgentPartnerTypeFilter;
    specialization: string;
    city: string;
    stageId: string;
    status: ActiveListStatusFilter;
    sort: ActiveListSort;
    taxonomy?: ActiveListTaxonomyLabels | null;
  },
): Partnership[] {
  let next = rows;
  if (opts.searchQuery.trim()) {
    next = next.filter((p) =>
      matchesActivePartnerSearch(p, meId, opts.searchQuery, opts.taxonomy),
    );
  }
  if (
    opts.partnerType ||
    opts.specialization ||
    opts.city.trim() ||
    opts.stageId ||
    opts.status
  ) {
    next = next.filter((p) => {
      const partner = partnershipPartnerUser(p, meId);
      if (!matchesActivePartnerCity(partner, opts.city)) return false;
      if (!matchesListPartnerType(partner, opts.partnerType)) return false;
      if (!matchesListSpecialization(partner, opts.specialization)) return false;
      if (!matchesListStage(partner, opts.stageId)) return false;
      if (!matchesActivePartnerStatus(p, opts.status)) return false;
      return true;
    });
  }
  return sortActivePartnerships(next, opts.sort, meId);
}

export function specializationChipLabel(
  specialization: string,
  taxonomy: ActiveListTaxonomyLabels | null | undefined,
): string {
  const label = resolveSpecializationLabel(specialization, taxonomy);
  return label ? `Специализация: ${label}` : "Специализация";
}

export function stageChipLabel(
  stageId: string,
  taxonomy: ActiveListTaxonomyLabels | null | undefined,
): string {
  const label = resolveStageLabel(stageId, taxonomy);
  return label ? `Этап: ${label}` : "Этап";
}

export function partnerTypeChipLabel(type: Exclude<AgentPartnerTypeFilter, "">): string {
  return `Тип: ${ACTIVE_PARTNER_TYPE_LABELS[type]}`;
}

/** Reset clears restrictions + query; preserves sort and view mode (caller keeps those). */
export function hasActiveListResettableRestrictions(
  input: ActiveListRestrictionInput & { searchQuery: string },
): boolean {
  return (
    countActiveListRestrictions(input) > 0 || normalizePartnerSearchText(input.searchQuery).length > 0
  );
}
