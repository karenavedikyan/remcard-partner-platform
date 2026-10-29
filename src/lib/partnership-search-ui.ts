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

export function mergeSearchResultPages<T extends { id: string }>(
  prev: T[],
  batch: T[],
  mode: "reset" | "append",
): T[] {
  if (mode === "reset") return batch;
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...batch.filter((p) => !seen.has(p.id))];
}

export type SearchPageMode = "reset" | "append";

/**
 * Monotonic search request gate. Abort alone is not enough when a late response
 * still resolves: both replace (reset) and append must compare sequence before
 * applying partners or nextCursor.
 */
export type SearchRequestGate = {
  /** Latest issued request id (ref-friendly mutable box). */
  latest: { current: number };
  /** Begin a request for reset or append — always bumps latest. */
  begin: () => number;
  /** True only while this request is still the latest. */
  isCurrent: (requestSeq: number) => boolean;
};

export function createSearchRequestGate(): SearchRequestGate {
  const latest = { current: 0 };
  return {
    latest,
    begin: () => {
      latest.current += 1;
      return latest.current;
    },
    isCurrent: (requestSeq: number) => requestSeq === latest.current,
  };
}

export type SearchPageSnapshot<T extends { id: string }> = {
  items: T[];
  nextCursor: string | null;
};

/**
 * Apply a search page only if requestSeq is still current.
 * Gates both replace and append — including nextCursor — so a slow older `q`
 * cannot overwrite newer cards with a stale cursor after the new response won.
 */
export function applySearchPageIfCurrent<T extends { id: string }>(input: {
  requestSeq: number;
  latestSeq: number;
  mode: SearchPageMode;
  prev: SearchPageSnapshot<T>;
  batch: T[];
  nextCursor: string | null | undefined;
}): SearchPageSnapshot<T> | null {
  if (input.requestSeq !== input.latestSeq) return null;
  return {
    items: mergeSearchResultPages(input.prev.items, input.batch, input.mode),
    nextCursor: input.nextCursor ?? null,
  };
}
