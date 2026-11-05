import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import { isOrgStaffWorkplaceViewer } from "@/lib/cabinet-presentation/access-block";
import type { AuthUser } from "@/lib/types";
import { businessHomeNavContextFromPresentation, shouldRenderBusinessOwnerHome } from "./gate";

/** Personal MASTER/R06 home must not win over active org workplace cabinet. */
export function shouldDeferPersonalSpecialistHome(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
  presentation: Pick<
    CabinetPresentationSnapshot,
    "workplacePartnerType" | "workplacePartnerTypeSource" | "proContext"
  >,
): boolean {
  if (shouldRenderBusinessOwnerHome(user, businessHomeNavContextFromPresentation(presentation))) {
    return true;
  }
  if (
    presentation.workplacePartnerTypeSource === "org-context" &&
    isOrgStaffWorkplaceViewer(presentation.proContext)
  ) {
    return true;
  }
  return false;
}
