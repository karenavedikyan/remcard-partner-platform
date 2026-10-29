import type { PartnerTaxonomyItem } from "@/lib/types";

/**
 * Repair-path navigator for partner discovery vitrine.
 * Stages come from live /api/pro/partner-taxonomy — never hardcode demo 7/5/7.
 * Counts must reflect the full matching set when the API provides facets;
 * page-local counts are forbidden as "found" totals.
 */

export type RepairPathStage = {
  id: string;
  label: string;
  index: number;
  /** Full matching count when known; null = unknown (do not fake). */
  matchCount: number | null;
  /** Explicitly unavailable (known zero from full set). */
  unavailable: boolean;
};

export type DiscoveryFacetCounts = {
  /** Total partners matching current filters (full set). */
  total: number | null;
  byStage: Record<string, number>;
  byProduct: Record<string, number>;
  byService: Record<string, number>;
};

export type PartnerSearchFacetsDto = {
  total?: number | null;
  stages?: Record<string, number> | null;
  products?: Record<string, number> | null;
  services?: Record<string, number> | null;
};

/** Normalize optional facets from search response — absent ≠ zeros. */
export function adaptDiscoveryFacets(
  facets: PartnerSearchFacetsDto | null | undefined,
): DiscoveryFacetCounts | null {
  if (!facets) return null;
  const hasAny =
    facets.total != null ||
    (facets.stages && Object.keys(facets.stages).length > 0) ||
    (facets.products && Object.keys(facets.products).length > 0) ||
    (facets.services && Object.keys(facets.services).length > 0);
  if (!hasAny) return null;
  return {
    total: typeof facets.total === "number" ? facets.total : null,
    byStage: { ...(facets.stages ?? {}) },
    byProduct: { ...(facets.products ?? {}) },
    byService: { ...(facets.services ?? {}) },
  };
}

/**
 * Build stage navigator rows from taxonomy + optional full-set facets.
 * Selecting a stage must reset specialization/direction in the caller.
 */
export function buildRepairPathStages(
  taxonomyStages: PartnerTaxonomyItem[],
  facets: DiscoveryFacetCounts | null,
): RepairPathStage[] {
  return taxonomyStages.map((stage, index) => {
    if (!facets) {
      return {
        id: stage.id,
        label: stage.label,
        index,
        matchCount: null,
        unavailable: false,
      };
    }
    const count = facets.byStage[stage.id];
    if (typeof count !== "number") {
      // Facets present but key missing → treat as zero (full set known).
      return {
        id: stage.id,
        label: stage.label,
        index,
        matchCount: 0,
        unavailable: true,
      };
    }
    return {
      id: stage.id,
      label: stage.label,
      index,
      matchCount: count,
      unavailable: count === 0,
    };
  });
}

/**
 * Direction counters for products/services — only from full matching facets.
 * When facets exist, missing keys are zero (unavailable). Hide empty chips in UI.
 */
export function buildDirectionCounters(
  items: PartnerTaxonomyItem[],
  counts: Record<string, number> | undefined,
): Array<{ id: string; label: string; count: number | null; unavailable: boolean }> {
  if (!counts) {
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      count: null,
      unavailable: false,
    }));
  }
  return items.map((item) => {
    const count = counts[item.id];
    if (typeof count !== "number") {
      return { id: item.id, label: item.label, count: 0, unavailable: true };
    }
    return {
      id: item.id,
      label: item.label,
      count,
      unavailable: count === 0,
    };
  });
}

/** Selecting a stage clears specialization (direction) — pure helper. */
export function stageSelectionResetsDirection<T extends { specialization: string; stageId: string }>(
  prev: T,
  nextStageId: string,
): T {
  if (prev.stageId === nextStageId) return prev;
  return { ...prev, stageId: nextStageId, specialization: "" };
}

export function repairPathProgressPercent(input: {
  totalStages: number;
  selectedIndex: number | null;
  coveredStages: number;
}): number {
  const { totalStages, selectedIndex, coveredStages } = input;
  if (totalStages <= 0) return 0;
  if (selectedIndex != null && selectedIndex >= 0) {
    return Math.round(((selectedIndex + 1) / totalStages) * 100);
  }
  return Math.round((coveredStages / totalStages) * 100);
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** User-facing copy when facets are temporarily unavailable — not developer API gap. */
export const DISCOVERY_FACETS_UNAVAILABLE =
  "Полные счётчики по этапам пока недоступны. Числа с текущей страницы не показываем.";
