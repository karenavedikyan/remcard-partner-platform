import type { PublicationState } from "@/lib/partner-1c-catalog/models";

export function clonePublication(pub: PublicationState): PublicationState {
  return {
    hidden: new Set(pub.hidden),
    branchOff: new Map(
      [...pub.branchOff.entries()].map(([id, set]) => [id, new Set(set)]),
    ),
    branchPrice: new Map(
      [...pub.branchPrice.entries()].map(([id, prices]) => [id, { ...prices }]),
    ),
    branchPct: { ...pub.branchPct },
  };
}