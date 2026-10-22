import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { isOrganizationStaffEmployee } from "@/lib/profile-staff-cabinet";
import type { ProProfileResponse } from "@/lib/types";

export type BusinessProfilePartnerType = "STORE" | "COMPANY";

export function businessProfilePartnerType(
  profile: Pick<ProProfileResponse, "user">,
): BusinessProfilePartnerType | null {
  const pt = profile.user.partnerType;
  if (pt === "STORE" || pt === "COMPANY") return pt;
  return null;
}

/** Store/company owner working-profile wizard (not staff, not legacy pure agent). */
export function businessProfileWizardEligible(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null,
): boolean {
  const pt = businessProfilePartnerType(profile);
  if (!pt) return false;
  if (profile.user.role !== "PRO") return false;
  if (isPureAgentActivities(profile.user.partnerActivities)) return false;
  if (isOrganizationStaffEmployee(profile, proContext)) return false;
  return true;
}
