/**
 * Local display adapter for partners-prototype-v1.
 * Does NOT invent a new AGENT includes() classifier — reuses existing
 * isPureAgentActivities / partnerType helpers from partnership-agent-inviter.
 * When feat/partner-primary-kind-unify lands, prefer resolvePartnerKindUi via
 * this adapter without rewriting callers.
 */
import { isPureAgentActivities } from "@/lib/partnership-agent-inviter";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";

export type PartnerPrimaryKindUi = "agent" | "specialist" | "store" | "company";

export const PARTNER_PRIMARY_KIND_LABELS: Record<PartnerPrimaryKindUi, string> = {
  agent: "Агент",
  specialist: "Специалист",
  store: "Магазин",
  company: "Компания",
};

/**
 * Single primary business kind.
 * ОПТОВИК COMPANY + STORE (+ optional AGENT activity) → company (not agent).
 * Pure AGENT activities → agent (Седа-style legacy COMPANY+AGENT without STORE/SERVICE).
 */
export function adaptPartnerPrimaryKind(input: {
  partnerType: string | null | undefined;
  partnerActivities?: string[] | null;
  organizationPartnerType?: string | null;
}): PartnerPrimaryKindUi | null {
  const activities = input.partnerActivities ?? [];
  if (isPureAgentActivities(activities)) return "agent";

  const type = input.partnerType ?? null;
  const orgType = input.organizationPartnerType ?? null;

  if (type === "STORE" || orgType === "STORE") return "store";
  if (type === "MASTER") return "specialist";
  if (type === "COMPANY" || orgType === "COMPANY") return "company";
  return null;
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
