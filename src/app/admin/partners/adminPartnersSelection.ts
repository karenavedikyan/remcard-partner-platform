import { MAX_BULK_SELECTION } from "@/app/admin/partners/adminPartnersRegistryConstants";

export type SelectedPartnerRef = {
  id: string;
  displayName: string | null;
};

export type PageSelectionState = "none" | "partial" | "all";

export function selectionCount(map: ReadonlyMap<string, SelectedPartnerRef>): number {
  return map.size;
}

export function selectedOnPageCount(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  pageIds: readonly string[],
): number {
  let n = 0;
  for (const id of pageIds) {
    if (map.has(id)) n += 1;
  }
  return n;
}

export function selectedOnOtherPagesCount(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  pageIds: readonly string[],
): number {
  return map.size - selectedOnPageCount(map, pageIds);
}

export function pageSelectionState(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  pageIds: readonly string[],
): PageSelectionState {
  if (pageIds.length === 0) return "none";
  const onPage = selectedOnPageCount(map, pageIds);
  if (onPage === 0) return "none";
  if (onPage === pageIds.length) return "all";
  return "partial";
}

export function togglePartnerSelection(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  partner: SelectedPartnerRef,
): { next: Map<string, SelectedPartnerRef>; blockedByLimit: boolean } {
  const next = new Map(map);
  if (next.has(partner.id)) {
    next.delete(partner.id);
    return { next, blockedByLimit: false };
  }
  if (next.size >= MAX_BULK_SELECTION) {
    return { next: new Map(map), blockedByLimit: true };
  }
  next.set(partner.id, partner);
  return { next, blockedByLimit: false };
}

export function selectAllPartnersOnPage(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  partners: readonly SelectedPartnerRef[],
): { next: Map<string, SelectedPartnerRef>; capped: boolean } {
  const next = new Map(map);
  let capped = false;
  for (const partner of partners) {
    if (next.has(partner.id)) continue;
    if (next.size >= MAX_BULK_SELECTION) {
      capped = true;
      break;
    }
    next.set(partner.id, partner);
  }
  return { next, capped };
}

export function clearPageSelection(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  pageIds: readonly string[],
): Map<string, SelectedPartnerRef> {
  const next = new Map(map);
  for (const id of pageIds) next.delete(id);
  return next;
}

export function clearAllSelection(): Map<string, SelectedPartnerRef> {
  return new Map();
}

export function removePartnersFromSelection(
  map: ReadonlyMap<string, SelectedPartnerRef>,
  ids: readonly string[],
): Map<string, SelectedPartnerRef> {
  const next = new Map(map);
  for (const id of ids) next.delete(id);
  return next;
}
