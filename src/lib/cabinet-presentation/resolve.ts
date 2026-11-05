import { resolveCabinetNavMode, type CabinetNavMode } from "@/lib/cabinet-nav/mode";
import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import type { CabinetPresentationSnapshot, WorkplacePartnerType } from "./types";
import { proContextRoleLabelRu } from "./role-labels";

const ORG_WORKPLACE_MEMBER_ROLES = new Set([
  "ORG_OWNER",
  "ORG_EMPLOYEE",
  "ORG_TEAM_MEMBER",
  "BRANCH_MANAGER",
  "BRANCH_EMPLOYEE",
]);

const KNOWN_PRO_CONTEXT_ROLES = new Set([
  "ORG_OWNER",
  "ORG_EMPLOYEE",
  "ORG_TEAM_MEMBER",
  "BRANCH_MANAGER",
  "BRANCH_EMPLOYEE",
  "PARTNER_MANAGER",
  "PARTNER_EMPLOYEE",
  "PARTNER_EMPLOYEE_SUSPENDED",
  "SOLO_PARTNER",
]);

export function isKnownProContextRole(role: string | null | undefined): boolean {
  if (!role?.trim()) return false;
  return KNOWN_PRO_CONTEXT_ROLES.has(role);
}

export function isOrgWorkplaceMemberRole(role: string | null | undefined): boolean {
  return Boolean(role && ORG_WORKPLACE_MEMBER_ROLES.has(role));
}

/** Org staff personal accounts: business workplace shell before personal agent/specialist gates. */
export function shouldPreferBusinessWorkplaceDispatch(input: {
  user: Pick<AuthUser, "role">;
  proContextRole: string | null | undefined;
  workplacePartnerType: WorkplacePartnerType | null;
}): boolean {
  if (!input.workplacePartnerType) return false;
  if (input.user.role === "CLIENT") return true;
  const role = input.proContextRole;
  return Boolean(role && isOrgWorkplaceMemberRole(role) && role !== "ORG_OWNER");
}

function normalizeOrgPartnerType(value: unknown): WorkplacePartnerType | null {
  if (value === "STORE" || value === "COMPANY") return value;
  return null;
}

/** Workplace store/company type from owner profile or trusted org context (not employer-only partner employee). */
export function resolveWorkplacePartnerType(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): WorkplacePartnerType | null {
  const { user, proContext, contextReady } = input;
  if (user.role === "PRO" && !isPureAgentActivities(user.partnerActivities)) {
    const ownerPt = normalizeOrgPartnerType(user.partnerType);
    if (ownerPt) return ownerPt;
  }
  if (!contextReady || !proContext) return null;
  const orgPt = normalizeOrgPartnerType(proContext.organization?.partnerType);
  if (orgPt && isOrgWorkplaceMemberRole(proContext.role)) {
    return orgPt;
  }
  return null;
}

export function resolveCabinetSessionRoleLabel(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContext: ProContextSnapshot | null;
  workplacePartnerType: WorkplacePartnerType | null;
}): string {
  const { user, proContext, workplacePartnerType } = input;
  const position = proContext?.membershipPosition?.trim();
  if (position) return position;

  const roleLabel = proContextRoleLabelRu(proContext?.role);
  if (roleLabel) return roleLabel;

  if (
    user.role === "PRO" &&
    workplacePartnerType &&
    !isPureAgentActivities(user.partnerActivities)
  ) {
    return "Владелец профиля";
  }

  return "Сотрудник";
}

export function resolveWorkspaceOrganizationName(proContext: ProContextSnapshot | null): string | null {
  const orgName = proContext?.organization?.name?.trim();
  if (orgName) return orgName;
  const employerName = proContext?.employer?.displayName?.trim();
  return employerName || null;
}

export function resolveCabinetPresentation(input: {
  user: AuthUser;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
  contextHttpStatus: number | null;
}): CabinetPresentationSnapshot {
  const workplacePartnerType = resolveWorkplacePartnerType({
    user: input.user,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });
  const navMode: CabinetNavMode = resolveCabinetNavMode(input.user, {
    workplacePartnerType,
  });
  const actorDisplayName = input.user.displayName?.trim() || "Партнёр RemCard";

  return {
    contextReady: input.contextReady,
    contextHttpStatus: input.contextHttpStatus,
    proContext: input.proContext,
    workplacePartnerType,
    actorDisplayName,
    workspaceOrganizationName: resolveWorkspaceOrganizationName(input.proContext),
    sessionRoleLabel: resolveCabinetSessionRoleLabel({
      user: input.user,
      proContext: input.proContext,
      workplacePartnerType,
    }),
    navMode,
  };
}

/** Employees with cabinet access must have resolvable org workplace context (fail-closed). */
export function employeeRequiresWorkplaceContext(input: {
  isEmployee: boolean;
  presentation: CabinetPresentationSnapshot;
}): boolean {
  if (!input.isEmployee) return false;
  if (!input.presentation.contextReady) return true;
  const role = input.presentation.proContext?.role;
  if (role && !isKnownProContextRole(role)) return true;
  if (isOrgWorkplaceMemberRole(role) && !input.presentation.workplacePartnerType) {
    return true;
  }
  return false;
}
