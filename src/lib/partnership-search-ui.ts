import type { SearchRole } from "@/lib/partnership-rules";
import type { PartnerSearchResult } from "@/lib/types";

export type PartnershipSearchFilterState = {
  query: string;
  city: string;
  filterProducts: string[];
  filterServices: string[];
  filterStages: string[];
  searchRole: SearchRole;
};

export function hasCustomPartnershipSearchFilters(
  state: PartnershipSearchFilterState,
  defaultRole: SearchRole,
): boolean {
  return (
    state.query.trim().length > 0 ||
    state.city.trim().length > 0 ||
    state.filterProducts.length > 0 ||
    state.filterServices.length > 0 ||
    state.filterStages.length > 0 ||
    state.searchRole !== defaultRole
  );
}

export function mergeSearchResultPages(
  prev: PartnerSearchResult[],
  batch: PartnerSearchResult[],
  mode: "reset" | "append",
): PartnerSearchResult[] {
  if (mode === "reset") return batch;
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...batch.filter((p) => !seen.has(p.id))];
}
