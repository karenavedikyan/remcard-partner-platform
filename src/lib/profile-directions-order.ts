import type { PartnerTaxonomyItem } from "@/lib/types";

export function directionMatchesFilter(item: PartnerTaxonomyItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return item.label.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle);
}

/**
 * Order of tiles in the direction picker.
 *
 * `pinnedIds` is a snapshot of the selection taken when the picker is opened, the group tab is
 * switched or the search is cleared — NOT the live selection. Clicking a tile therefore never
 * moves it; previously selected tiles rise to the top only at the next snapshot.
 * With a non-empty query only matching items are returned (selected ones that do not match are
 * still visible in «Уже выбрано»).
 */
export function orderedVisibleItems(
  all: PartnerTaxonomyItem[],
  pinnedIds: string[],
  q: string,
): PartnerTaxonomyItem[] {
  const matching = all.filter((item) => directionMatchesFilter(item, q));
  const pinned = new Set(pinnedIds);
  const first = pinnedIds
    .map((id) => matching.find((item) => item.id === id))
    .filter((item): item is PartnerTaxonomyItem => Boolean(item));
  const rest = matching.filter((item) => !pinned.has(item.id));
  return [...first, ...rest];
}
