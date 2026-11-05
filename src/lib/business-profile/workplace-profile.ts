import { isOrgStaffWorkplaceViewer } from "@/lib/cabinet-presentation/access-block";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import type { BusinessProfilePartnerType } from "./eligibility";

/** Org staff profile chrome from trusted workplace context (not owned /api/pro/profile org). */
export function resolveOrgStaffWorkplaceProfile(
  presentation: Pick<
    CabinetPresentationSnapshot,
    "workplacePartnerType" | "workplacePartnerTypeSource" | "proContext"
  >,
): { partnerType: BusinessProfilePartnerType } | null {
  if (presentation.workplacePartnerTypeSource !== "org-context") return null;
  if (!presentation.workplacePartnerType) return null;
  if (!isOrgStaffWorkplaceViewer(presentation.proContext)) return null;
  return { partnerType: presentation.workplacePartnerType };
}
