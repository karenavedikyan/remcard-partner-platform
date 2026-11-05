import {
  isOrgWorkplaceMemberRole,
  resolveWorkplacePartnerType,
} from "@/lib/cabinet-presentation/resolve";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";

export type BusinessClientsPartnerType = "STORE" | "COMPANY";

export function resolveBusinessOwnerClientsEligibility(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContextRole: string | null | undefined;
  proContext?: ProContextSnapshot | null;
  contextReady?: boolean;
}): { eligible: false } | { eligible: true; partnerType: BusinessClientsPartnerType } {
  const contextReady = input.contextReady ?? Boolean(input.proContextRole);
  const workplacePartnerType = resolveWorkplacePartnerType({
    user: input.user,
    proContext: input.proContext ?? null,
    contextReady,
  });
  if (!workplacePartnerType) return { eligible: false };
  if (!isOrgWorkplaceMemberRole(input.proContextRole)) return { eligible: false };
  if (input.proContextRole === "ORG_OWNER" && input.user.role === "PRO") {
    return { eligible: true, partnerType: workplacePartnerType };
  }
  if (input.user.role === "CLIENT" && input.proContextRole !== "ORG_OWNER") {
    return { eligible: true, partnerType: workplacePartnerType };
  }
  if (input.proContextRole === "ORG_OWNER") {
    return { eligible: true, partnerType: workplacePartnerType };
  }
  return { eligible: false };
}
