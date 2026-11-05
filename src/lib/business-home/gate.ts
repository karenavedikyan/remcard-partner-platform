import {
  resolveCabinetNavMode,
  type ResolveCabinetNavModeOptions,
} from "@/lib/cabinet-nav/mode";
import type {
  CabinetPresentationSnapshot,
  WorkplacePartnerType,
} from "@/lib/cabinet-presentation/types";
import type { AuthUser } from "@/lib/types";

export function businessHomeNavContextFromPresentation(
  presentation: Pick<
    CabinetPresentationSnapshot,
    "workplacePartnerType" | "workplacePartnerTypeSource"
  >,
): ResolveCabinetNavModeOptions {
  return {
    workplacePartnerType: presentation.workplacePartnerType,
    workplaceNavFromOrgContext: presentation.workplacePartnerTypeSource === "org-context",
  };
}

/** Store/company prototype home (owner or org workplace member with trusted context). */
export function shouldRenderBusinessOwnerHome(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
  navContext?: ResolveCabinetNavModeOptions,
): boolean {
  const mode = resolveCabinetNavMode(user, navContext);
  return mode === "business-store" || mode === "business-company";
}

export function businessOwnerHomePartnerType(
  user: Pick<AuthUser, "partnerType">,
  workplacePartnerType?: WorkplacePartnerType | null,
): "STORE" | "COMPANY" | null {
  if (workplacePartnerType === "STORE" || workplacePartnerType === "COMPANY") {
    return workplacePartnerType;
  }
  if (user.partnerType === "STORE") return "STORE";
  if (user.partnerType === "COMPANY") return "COMPANY";
  return null;
}
