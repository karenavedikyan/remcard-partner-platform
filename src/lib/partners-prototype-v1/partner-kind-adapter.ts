/**
 * Local display adapter for partners-prototype-v1.
 * Thin wrap around shared resolvePartnerKindUi — no parallel classifier.
 */
import {
  resolvePartnerKindUi,
  PARTNER_KIND_UI_LABELS,
  type PartnerKindUi,
} from "@/lib/partner-kind-ui";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";

export type PartnerPrimaryKindUi = PartnerKindUi;

export const PARTNER_PRIMARY_KIND_LABELS = PARTNER_KIND_UI_LABELS;

/**
 * Single primary business kind via shared resolver.
 * ОПТОВИК COMPANY + STORE (+ optional AGENT activity) → company/store per resolvePartnerKindUi.
 * Pure AGENT activities → agent.
 */
export function adaptPartnerPrimaryKind(input: {
  partnerType: string | null | undefined;
  partnerActivities?: string[] | null;
  /** Ignored: shared resolver uses user partnerType + activities only. */
  organizationPartnerType?: string | null;
}): PartnerPrimaryKindUi | null {
  return resolvePartnerKindUi({
    partnerType: input.partnerType,
    partnerActivities: input.partnerActivities ?? [],
  });
}

export function partnerKindToListFilter(
  kind: PartnerPrimaryKindUi | null,
): AgentPartnerTypeFilter {
  if (!kind) return "";
  return kind;
}

export function listFilterToPartnerKind(
  filter: AgentPartnerTypeFilter,
): PartnerPrimaryKindUi | "" {
  if (!filter) return "";
  return filter;
}
