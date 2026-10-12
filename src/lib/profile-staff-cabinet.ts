import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

const ORG_STAFF_CONTEXT_ROLES = new Set([
  "ORG_TEAM_MEMBER",
  "ORG_EMPLOYEE",
  "BRANCH_EMPLOYEE",
  "BRANCH_MANAGER",
]);

/** User has own partner / catalog activity (independent of employer). */
export function hasOwnPartnerActivity(profile: ProProfileResponse): boolean {
  if (profile.user.partnerType) return true;
  if ((profile.user.partnerActivities?.length ?? 0) > 0) return true;
  const w = profile.workingProfile;
  if (w?.partnerSearchOptInExplicit && w.partnerSearchOptIn) return true;
  if (w?.partnerSearchVisible && !w?.partnerSearchOptInExplicit) return true;
  return false;
}

/** Pure organization staff: CLIENT, active org context, no independent partner profile. */
export function isOrganizationStaffEmployee(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null,
): boolean {
  if (profile.user.role !== "CLIENT") return false;
  if (hasOwnPartnerActivity(profile)) return false;
  if (!proContext?.organization?.id) return false;
  if (proContext.membershipKind) return true;
  if (proContext.role && ORG_STAFF_CONTEXT_ROLES.has(proContext.role)) return true;
  return false;
}

export function staffAccessScopeLabel(proContext: ProContextSnapshot | null): string | null {
  if (!proContext?.organization) return null;
  if (proContext.membershipKind === "HEAD_OFFICE") {
    const n = proContext.branches?.length ?? 0;
    return n > 0 ? `Штаб · ${n} филиал(ов) по правам` : "Штаб организации";
  }
  if (proContext.activeBranch?.name) {
    return `Филиал: ${proContext.activeBranch.name}`;
  }
  return proContext.organization.name;
}

export function staffPositionLabel(proContext: ProContextSnapshot | null): string | null {
  const p = proContext?.membershipPosition?.trim();
  return p || null;
}
