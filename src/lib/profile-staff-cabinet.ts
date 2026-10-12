import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

/** CLIENT employee in an organization without own partner profile. */
export function isOrganizationStaffEmployee(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null,
): boolean {
  if (profile.user.role !== "CLIENT") return false;
  if (profile.user.partnerType) return false;
  return Boolean(proContext?.organization?.id ?? profile.organization?.id);
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
