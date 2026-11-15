import type { SearchRole } from "@/lib/partnership-rules";
import type { ProProfileUser } from "@/lib/types";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";

type SearchActor = Pick<ProProfileUser, "partnerType" | "partnerActivities" | "role">;

/**
 * Public receiving-policy chips in partner search (duration / purchase count only).
 * Does not replace {@link shouldShowAgentPublishedTermsForSearch} — agent pool % and invite
 * financial blocks stay on the existing AGENT-only gate.
 */
export function shouldShowPublicCertificatePolicyInPartnerSearch(
  actor: SearchActor,
  _searchRole: SearchRole,
): boolean {
  if (actor.role !== "PRO") return false;
  if (isAgentCooperationInviter(actor)) return true;
  const pt = actor.partnerType;
  return pt === "STORE" || pt === "COMPANY" || pt === "MASTER";
}

export function shouldRenderPartnerSearchInlineTermsPanel(input: {
  showAgentPublishedTerms: boolean;
  showPublicCertificatePolicy: boolean;
}): boolean {
  return input.showAgentPublishedTerms || input.showPublicCertificatePolicy;
}

export function partnerSearchInlineTermsVariant(
  showAgentPublishedTerms: boolean,
): "agent-financial" | "public-certificate" {
  return showAgentPublishedTerms ? "agent-financial" : "public-certificate";
}