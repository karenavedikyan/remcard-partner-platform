import type {
  EmployeesOverviewResponse,
  OrganizationPendingInviteRow,
  TeamMemberRow,
} from "./employees-overview-types";
import { summarizeMemberAccess } from "./prof-i-member-permissions";

export type TeamSectionView = "people" | "locations" | "invites";

export const HEAD_OFFICE_LOCATION_ID = "__head_office__";

export type UnifiedPendingInvite = {
  id: string;
  label: string;
  position: string | null;
  scopeLabel: string;
  expiresAt: string | null;
  status: string;
  url: string | null;
  source: "organization" | "branch" | "staff";
  revokeId: string | null;
};

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function memberDisplayName(member: TeamMemberRow): string {
  return member.fullName?.trim() || member.displayName;
}

export function resolveDisplayTeam(overview: EmployeesOverviewResponse): TeamMemberRow[] {
  if (overview.team?.length) return overview.team;
  const byUser = new Map<string, TeamMemberRow>();
  for (const branch of overview.branches) {
    for (const emp of branch.employees) {
      const uid = emp.user.id;
      let row = byUser.get(uid);
      if (!row) {
        row = {
          userId: uid,
          displayName: emp.user.displayName,
          publicId: emp.user.publicId,
          photoUrl: emp.user.photoUrl,
          lastActiveAt: emp.user.lastActiveAt,
          fullName: emp.fullName,
          position: null,
          membershipKind: "LEGACY",
          orgMemberStatus: null,
          branchAccess: [],
        };
        byUser.set(uid, row);
      }
      row.branchAccess.push({
        employeeId: emp.id,
        branchId: branch.id,
        branchName: branch.name,
        city: branch.city,
        role: emp.role,
        permissions: emp.permissions,
      });
    }
  }
  return [...byUser.values()];
}

export function formatAccessScopeLabel(
  member: TeamMemberRow,
  totalBranchCount: number,
): { primary: string; secondary: string } {
  const branchNames = member.branchAccess.map((b) => b.branchName);
  const n = branchNames.length;
  const hasOffice = member.membershipKind === "HEAD_OFFICE";
  let primary = "";
  if (n === totalBranchCount && totalBranchCount > 0) {
    primary = `Все ${totalBranchCount} текущих филиалов`;
  } else if (n === 1) {
    primary = branchNames[0]!;
  } else if (n > 1) {
    primary = `${n} ${n === 1 ? "филиал" : n < 5 ? "филиала" : "филиалов"}`;
  }
  if (hasOffice) {
    primary = primary ? `${primary} + Головной офис` : "Головной офис";
  }
  if (!primary) {
    primary = hasOffice ? "Головной офис" : "Без доступа к операциям филиалов";
  }
  let secondary = "Должность не определяет доступ";
  if (n === 1 && !hasOffice) {
    secondary = branchNames[0]!;
  } else if (n > 1 && n !== totalBranchCount) {
    secondary = branchNames.slice(0, 2).join(", ") + (n > 2 ? "…" : "");
  } else if (n === totalBranchCount && totalBranchCount > 0) {
    secondary = "Новые филиалы добавляются отдельно";
  }
  return { primary, secondary };
}

export function memberMatchesLocation(member: TeamMemberRow, locationId: string): boolean {
  if (locationId === HEAD_OFFICE_LOCATION_ID) {
    return member.membershipKind === "HEAD_OFFICE";
  }
  return member.branchAccess.some((b) => b.branchId === locationId);
}

export function filterTeamMembers(input: {
  members: TeamMemberRow[];
  query: string;
  locationFilter: string;
}): TeamMemberRow[] {
  const q = input.query.trim().toLowerCase();
  return input.members.filter((m) => {
    const hay = `${memberDisplayName(m)} ${m.position ?? ""} ${m.publicId}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (input.locationFilter === "all") return true;
    return memberMatchesLocation(m, input.locationFilter);
  });
}

export function countHeadOfficeMembers(members: TeamMemberRow[]): number {
  return members.filter((m) => m.membershipKind === "HEAD_OFFICE").length;
}

export function computeTeamStats(
  overview: EmployeesOverviewResponse,
  members: TeamMemberRow[],
  pendingInvites: UnifiedPendingInvite[],
) {
  const employees =
    overview.summary.uniqueEmployees ??
    overview.summary.totalEmployees ??
    members.length;
  return {
    employees,
    branches: overview.branches.length,
    headOffice: countHeadOfficeMembers(members),
    pendingInvites: pendingInvites.length || overview.summary.pendingInvites || 0,
  };
}

function scopeLabelFromOrgInvite(inv: OrganizationPendingInviteRow, branchCount: number): string {
  if (inv.allCurrentBranchesSnapshot && branchCount > 0) {
    return `Все ${branchCount} текущих филиалов${inv.membershipKind === "HEAD_OFFICE" ? " + Головной офис" : ""}`;
  }
  const parts: string[] = [];
  if (inv.branchIds.length) {
    parts.push(`${inv.branchIds.length} филиал${inv.branchIds.length === 1 ? "" : "а"}`);
  }
  if (inv.membershipKind === "HEAD_OFFICE") parts.push("Головной офис");
  return parts.join(" · ") || "Без филиалов";
}

export function mergePendingInvites(input: {
  overview: EmployeesOverviewResponse;
  staffInvites: Array<{
    id: string;
    url: string;
    role: string;
    position?: string | null;
    status: string;
    branchName: string | null;
    expiresAt: string;
    membershipKind?: string | null;
  }>;
}): UnifiedPendingInvite[] {
  const out: UnifiedPendingInvite[] = [];
  const seen = new Set<string>();
  const branchCount = input.overview.branches.length;

  for (const inv of input.overview.organizationPendingInvites ?? []) {
    if (seen.has(inv.id)) continue;
    seen.add(inv.id);
    out.push({
      id: inv.id,
      label: inv.fullName?.trim() || inv.position?.trim() || "Приглашение",
      position: inv.position,
      scopeLabel: scopeLabelFromOrgInvite(inv, branchCount),
      expiresAt: inv.expiresAt,
      status: inv.status,
      url: null,
      source: "organization",
      revokeId: inv.id,
    });
  }

  for (const branch of input.overview.branches) {
    for (const inv of branch.pendingInvites) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      out.push({
        id: inv.id,
        label: inv.fullName?.trim() || inv.position?.trim() || "Приглашение",
        position: inv.position,
        scopeLabel: branch.name,
        expiresAt: inv.expiresAt,
        status: inv.status,
        url: null,
        source: "branch",
        revokeId: inv.id,
      });
    }
  }

  for (const inv of input.staffInvites) {
    if (inv.status !== "PENDING" && inv.status !== "pending") continue;
    if (seen.has(inv.id)) continue;
    seen.add(inv.id);
    out.push({
      id: inv.id,
      label: inv.position?.trim() || inv.role,
      position: inv.position ?? null,
      scopeLabel: inv.branchName ?? (inv.membershipKind === "HEAD_OFFICE" ? "Головной офис" : "Организация"),
      expiresAt: inv.expiresAt,
      status: inv.status,
      url: inv.url,
      source: "staff",
      revokeId: inv.id,
    });
  }

  return out;
}

export function memberRoleSummary(member: TeamMemberRow): { title: string; hint: string } {
  const summary = summarizeMemberAccess(member);
  let hint = summary.mixed
    ? "Разные права по подразделениям"
    : summary.hasPayout
      ? "Выплаты партнёрам разрешены"
      : summary.subtitle.includes("продажа")
        ? "Продажа и начисление бонуса"
        : "Без оформления продаж";
  if (!summary.hasPayout && !summary.mixed) hint += " · без выплат";
  return {
    title: summary.subtitle.split(" · ")[0] ?? summary.subtitle,
    hint,
  };
}

export function canEditTeamMember(
  overview: EmployeesOverviewResponse,
  member: TeamMemberRow,
): boolean {
  if (overview.viewer.isOrgOwner) return true;
  return member.branchAccess.some(
    (b) => overview.viewer.canManageEmployeesByBranchId[b.branchId] === true,
  );
}
