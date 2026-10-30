import {
  partnershipAgentSegment,
  partnershipNeedsMyResponse,
} from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";

export type PartnerOverviewZone = "active" | "decide" | "waiting";

export type PartnerOverviewGroups = {
  /** ACTIVE/PAUSED, not archived/hidden — tile + active zone source. */
  active: Partnership[];
  /** Needs my response (INVITED/PENDING author ≠ me). */
  decisions: Partnership[];
  /** Current pending where I wait for the other side — not duplicated in decisions. */
  outgoing: Partnership[];
  /** Full authorized rows used for tile counts (pre search/page). */
  counts: {
    active: number;
    decisions: number;
    outgoing: number;
  };
};

function isArchived(p: Partnership): boolean {
  return Boolean(p.listPreference?.archivedAt);
}

function isHidden(p: Partnership): boolean {
  return Boolean(p.listPreference?.hiddenAt);
}

function isCurrentPendingStatus(status: string): boolean {
  return status === "INVITED" || status === "PENDING";
}

/**
 * Partition one authorized collection into overview groups.
 * Counts are independent of search/pagination; rejected/cancelled stay out of pending groups.
 */
export function partitionPartnerOverview(
  partnerships: Partnership[],
  meId: string,
): PartnerOverviewGroups {
  const active: Partnership[] = [];
  const decisions: Partnership[] = [];
  const outgoing: Partnership[] = [];

  for (const p of partnerships) {
    if (isHidden(p) || isArchived(p)) continue;

    if (partnershipAgentSegment(p.status) === "active") {
      active.push(p);
      continue;
    }

    if (!isCurrentPendingStatus(p.status)) continue;

    if (partnershipNeedsMyResponse(p, meId)) {
      decisions.push(p);
    } else {
      outgoing.push(p);
    }
  }

  return {
    active,
    decisions,
    outgoing,
    counts: {
      active: active.length,
      decisions: decisions.length,
      outgoing: outgoing.length,
    },
  };
}

export function overviewZoneForPartnership(
  partnership: Partnership,
  meId: string,
): PartnerOverviewZone | null {
  if (isHidden(partnership) || isArchived(partnership)) return null;
  if (partnershipAgentSegment(partnership.status) === "active") return "active";
  if (!isCurrentPendingStatus(partnership.status)) return null;
  return partnershipNeedsMyResponse(partnership, meId) ? "decide" : "waiting";
}

export function isPartnerOverviewEmpty(groups: PartnerOverviewGroups): boolean {
  return (
    groups.counts.active === 0 &&
    groups.counts.decisions === 0 &&
    groups.counts.outgoing === 0
  );
}
