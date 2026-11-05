import { isOrgStaffWorkplaceViewer } from "@/lib/cabinet-presentation/access-block";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";

export type BusinessHomeSurfaceMode = "owner-operating" | "org-staff-template";

export function resolveBusinessHomeSurfaceMode(
  presentation: Pick<
    CabinetPresentationSnapshot,
    "proContext" | "workplacePartnerType" | "workplacePartnerTypeSource"
  >,
): BusinessHomeSurfaceMode {
  if (
    presentation.workplacePartnerTypeSource === "org-context" &&
    isOrgStaffWorkplaceViewer(presentation.proContext)
  ) {
    return "org-staff-template";
  }
  return "owner-operating";
}
