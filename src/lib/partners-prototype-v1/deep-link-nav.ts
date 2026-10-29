import { partnershipAgentSegment } from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";

export type PartnershipDeepLinkNav = {
  segment: "active" | "invitations";
  invitationFlow?: "incoming" | "outgoing";
};

/**
 * Resolve list segment/flow for an authorized partnership deep-link.
 * Does not invent rows — caller must look up the id in the authorized collection first.
 */
export function resolvePartnershipDeepLinkNav(
  partnership: Pick<Partnership, "status" | "initiatedBy">,
  meId: string,
): PartnershipDeepLinkNav {
  const segment = partnershipAgentSegment(partnership.status);
  if (segment === "active") {
    return { segment: "active" };
  }
  const outgoing = partnership.initiatedBy === meId;
  return {
    segment: "invitations",
    invitationFlow: outgoing ? "outgoing" : "incoming",
  };
}
