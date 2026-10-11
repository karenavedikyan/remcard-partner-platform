import type {
  EmployeesOverviewResponse,
  OrganizationPendingInviteRow,
  TeamMemberRow,
} from "./employees-overview-types";
import type { InviteShareContext } from "./invite-share-message";
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
  share: InviteShareContext | null;
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

export function inviteScopeLabel(
  inv: OrganizationPendingInviteRow,
  branches: EmployeesOverviewResponse["branches"],
): string {
  const nameById = new Map(branches.map((b) => [b.id, b.name]));
  const parts: string[] = [];
  const ids = inv.branchIds ?? [];
  if (ids.length > 0) {
    if (inv.allCurrentBranchesSnapshot) {
      parts.push(`Все ${ids.length} филиалов на момент приглашения`);
    } else {
      const names = ids.map((id) => nameById.get(id) ?? id);
      parts.push(names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")}… (+${names.length - 2})`);
    }
  } else if (inv.allCurrentBranchesSnapshot) {
    parts.push("Все филиалы на момент приглашения");
  }
  if (inv.membershipKind === "HEAD_OFFICE") parts.push("Головной офис");
  return parts.join(" · ") || "Без филиалов";
}

type InviteMergeSeed = Omit<UnifiedPendingInvite, "url" | "share"> & {
  url?: string | null;
  share?: InviteShareContext | null;
};

function mergeInviteRow(map: Map<string, InviteMergeSeed>, row: InviteMergeSeed) {
  const prev = map.get(row.id);
  if (!prev) {
    map.set(row.id, { ...row, url: row.url ?? null });
    return;
  }
  map.set(row.id, {
    ...prev,
    ...row,
    label: prev.label || row.label,
    position: prev.position ?? row.position,
    scopeLabel: prev.scopeLabel || row.scopeLabel,
    expiresAt: row.expiresAt ?? prev.expiresAt,
    status: row.status || prev.status,
    url: row.url ?? prev.url ?? null,
    revokeId: row.revokeId ?? prev.revokeId,
    source: prev.source,
    share: row.share ?? prev.share ?? null,
  });
}

export function mergePendingInvites(input: {
  overview: EmployeesOverviewResponse;
  staffInvites: Array<{
    id: string;
    url: string;
    role: string;
    position?: string | null;
    fullName?: string | null;
    status: string;
    branchName: string | null;
    expiresAt: string;
    scope?: string | null;
    organizationName?: string | null;
    inviterDisplayName?: string | null;
    membershipKind?: string | null;
    branchIds?: string[];
    allCurrentBranchesSnapshot?: boolean;
  }>;
}): UnifiedPendingInvite[] {
  const map = new Map<string, InviteMergeSeed>();
  const branches = input.overview.branches;

  for (const inv of input.overview.organizationPendingInvites ?? []) {
    mergeInviteRow(map, {
      id: inv.id,
      label: inv.fullName?.trim() || inv.position?.trim() || "Приглашение",
      position: inv.position,
      scopeLabel: inviteScopeLabel(inv, branches),
      expiresAt: inv.expiresAt,
      status: inv.status,
      url: null,
      source: "organization",
      revokeId: inv.id,
      share: null,
    });
  }

  for (const branch of branches) {
    for (const inv of branch.pendingInvites) {
      mergeInviteRow(map, {
        id: inv.id,
        label: inv.fullName?.trim() || inv.position?.trim() || "Приглашение",
        position: inv.position,
        scopeLabel: branch.name,
        expiresAt: inv.expiresAt,
        status: inv.status,
        url: null,
        source: "branch",
        revokeId: inv.id,
        share: null,
      });
    }
  }

  for (const inv of input.staffInvites) {
    if (inv.status !== "PENDING" && inv.status !== "pending") continue;
    const orgShape: OrganizationPendingInviteRow | null =
      inv.branchIds || inv.allCurrentBranchesSnapshot || inv.membershipKind
        ? {
            id: inv.id,
            role: inv.role,
            position: inv.position ?? null,
            fullName: null,
            membershipKind: inv.membershipKind ?? null,
            branchIds: inv.branchIds ?? [],
            allCurrentBranchesSnapshot: inv.allCurrentBranchesSnapshot ?? false,
            createdAt: "",
            expiresAt: inv.expiresAt,
            status: inv.status,
          }
        : null;
    mergeInviteRow(map, {
      id: inv.id,
      label: inv.fullName?.trim() || inv.position?.trim() || inv.role,
      position: inv.position ?? null,
      scopeLabel: orgShape
        ? inviteScopeLabel(orgShape, branches)
        : (inv.branchName ?? (inv.membershipKind === "HEAD_OFFICE" ? "Головной офис" : "Организация")),
      expiresAt: inv.expiresAt,
      status: inv.status,
      url: inv.url,
      source: "staff",
      revokeId: inv.id,
      share: {
        url: inv.url,
        inviteeFullName: inv.fullName ?? null,
        inviterDisplayName: inv.inviterDisplayName ?? null,
        organizationName: inv.organizationName ?? null,
        scope: inv.scope ?? null,
      },
    });
  }

  return [...map.values()].map((row) => ({
    ...row,
    url: row.url ?? null,
    share: row.share ?? null,
  }));
}

export function canManageBranch(
  overview: EmployeesOverviewResponse,
  branchId: string,
): boolean {
  if (overview.viewer.isOrgOwner) return true;
  return overview.viewer.canManageEmployeesByBranchId[branchId] === true;
}

export function manageableBranchAccess(
  overview: EmployeesOverviewResponse,
  member: TeamMemberRow,
) {
  return member.branchAccess.filter(
    (b) => overview.viewer.isOrgOwner || overview.viewer.canManageEmployeesByBranchId[b.branchId],
  );
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
