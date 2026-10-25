import { shouldRenderBusinessOwnerHome } from "@/lib/business-home/gate";
import type { AuthUser } from "@/lib/types";

export type BusinessPartnersPartnerType = "STORE" | "COMPANY";

/** Org owner with store/company cabinet mode (not agent/specialist programs). */
export function resolveBusinessOwnerPartnersEligibility(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContextRole: string | null | undefined;
}): { eligible: false } | { eligible: true; partnerType: BusinessPartnersPartnerType } {
  if (!shouldRenderBusinessOwnerHome(input.user)) return { eligible: false };
  if (input.proContextRole !== "ORG_OWNER") return { eligible: false };
  if (input.user.partnerType === "STORE") return { eligible: true, partnerType: "STORE" };
  if (input.user.partnerType === "COMPANY") return { eligible: true, partnerType: "COMPANY" };
  return { eligible: false };
}
