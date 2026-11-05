import {
  resolveWorkplacePartnerType,
  shouldPreferBusinessWorkplaceDispatch,
} from "@/lib/cabinet-presentation/resolve";
import { resolveBusinessOwnerClientsEligibility } from "@/lib/business-clients/gate";
import {
  businessOwnerHomePartnerType,
  shouldRenderBusinessOwnerHome,
} from "@/lib/business-home/gate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";

export type BusinessSectionDispatchDecision =
  | { kind: "agent-r03" }
  | { kind: "specialist-r06" }
  | { kind: "business"; partnerType: "STORE" | "COMPANY" }
  | { kind: "legacy-issuer" }
  | { kind: "clients-unavailable" };

export function resolveBusinessSectionDispatch(input: {
  user: AuthUser;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
  r03Eligible: boolean;
  r06Eligible: boolean;
  surface: "clients" | "issuer";
}): BusinessSectionDispatchDecision {
  const workplacePartnerType = resolveWorkplacePartnerType({
    user: input.user,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });
  const proContextRole = input.proContext?.role ?? null;

  const preferWorkplace = shouldPreferBusinessWorkplaceDispatch({
    user: input.user,
    proContextRole,
    workplacePartnerType,
  });

  const businessFromContext = resolveBusinessOwnerClientsEligibility({
    user: input.user,
    proContextRole,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });

  if (preferWorkplace && businessFromContext.eligible) {
    return { kind: "business", partnerType: businessFromContext.partnerType };
  }

  if (input.r03Eligible) {
    return { kind: "agent-r03" };
  }
  if (input.r06Eligible) {
    return { kind: "specialist-r06" };
  }

  if (businessFromContext.eligible) {
    return { kind: "business", partnerType: businessFromContext.partnerType };
  }

  if (
    input.surface === "issuer" &&
    shouldRenderBusinessOwnerHome(input.user, workplacePartnerType)
  ) {
    const partnerType = businessOwnerHomePartnerType(input.user, workplacePartnerType);
    if (partnerType) {
      return { kind: "business", partnerType };
    }
    return { kind: "legacy-issuer" };
  }

  return input.surface === "issuer" ? { kind: "legacy-issuer" } : { kind: "clients-unavailable" };
}
