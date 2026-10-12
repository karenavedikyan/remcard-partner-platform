import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

const ORG_STAFF_CONTEXT_ROLES = new Set([
  "ORG_TEAM_MEMBER",
  "ORG_EMPLOYEE",
  "BRANCH_EMPLOYEE",
  "BRANCH_MANAGER",
]);

export type StaffBranchLine = {
  id: string;
  line: string;
};

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

function pluralFilial(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "филиал";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "филиала";
  return "филиалов";
}

export function formatStaffBranchLine(branch: {
  name: string;
  city: string;
  address?: string | null;
}): string {
  const name = branch.name.trim();
  const addr = branch.address?.trim();
  if (addr) {
    const normName = name.toLowerCase();
    const normAddr = addr.toLowerCase();
    if (normName.includes(normAddr)) return name;
    return `${name} — ${addr}`;
  }
  const city = branch.city?.trim();
  return city ? `${name} (${city})` : name;
}

/** Summary line for «Область доступа» (independent of active working branch). */
export function staffAccessScopeHeadline(proContext: ProContextSnapshot | null): string | null {
  if (!proContext?.organization) return null;
  const branches = proContext.branches ?? [];
  const n = branches.length;

  if (proContext.membershipKind === "HEAD_OFFICE") {
    if (n === 0) return "Головной офис";
    return `Головной офис и ${n} ${pluralFilial(n)}`;
  }

  if (proContext.membershipKind === "BRANCH_STAFF") {
    if (n === 0) return proContext.organization.name;
    if (n === 1) return formatStaffBranchLine(branches[0]!);
    return `${n} ${pluralFilial(n)}`;
  }

  if (n === 1) return formatStaffBranchLine(branches[0]!);
  if (n > 1) return `${n} ${pluralFilial(n)}`;
  return proContext.organization.name;
}

export function staffAccessScopeBranchLines(proContext: ProContextSnapshot | null): StaffBranchLine[] {
  if (!proContext?.branches?.length) return [];
  return proContext.branches.map((b) => ({
    id: b.id,
    line: formatStaffBranchLine(b),
  }));
}

export function staffWorkingBranchLine(proContext: ProContextSnapshot | null): string | null {
  const active = proContext?.activeBranch;
  if (!active) return null;
  return formatStaffBranchLine(active);
}

/** @deprecated Prefer staffAccessScopeHeadline + branch list in UI. */
export function staffAccessScopeLabel(proContext: ProContextSnapshot | null): string | null {
  return staffAccessScopeHeadline(proContext);
}

export function staffPositionLabel(proContext: ProContextSnapshot | null): string | null {
  const p = proContext?.membershipPosition?.trim();
  return p || null;
}
