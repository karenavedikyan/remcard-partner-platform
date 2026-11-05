import {
  isOrgWorkplaceMemberRole,
  resolveWorkplacePartnerTypeResolution,
} from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
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
  const proContext = input.proContext ?? null;
  if (contextReady && proContext && !validateProContextSnapshot(proContext).ok) {
    return { eligible: false };
  }
  const { partnerType: workplacePartnerType } = resolveWorkplacePartnerTypeResolution({
    user: input.user,
    proContext,
    contextReady,
  });
  if (!workplacePartnerType) return { eligible: false };
  if (!isOrgWorkplaceMemberRole(input.proContextRole)) return { eligible: false };
  return { eligible: true, partnerType: workplacePartnerType };
}
