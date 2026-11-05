import { resolveCabinetNavMode, type CabinetNavMode } from "@/lib/cabinet-nav/mode";
import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import type { CabinetPresentationSnapshot, WorkplacePartnerType } from "./types";
import { proContextRoleLabelRu } from "./role-labels";
import { validateProContextSnapshot } from "./validate";
import type { WorkplacePartnerTypeSource } from "./types";

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

/** Org staff (not org owner): business section shell before personal R03/R06. */
export function shouldPreferBusinessWorkplaceDispatch(input: {
  proContextRole: string | null | undefined;
  workplacePartnerType: WorkplacePartnerType | null;
  workplacePartnerTypeSource: WorkplacePartnerTypeSource;
}): boolean {
  if (!input.workplacePartnerType || input.workplacePartnerTypeSource !== "org-context") {
    return false;
  }
  const role = input.proContextRole;
  return Boolean(role && isOrgWorkplaceMemberRole(role) && role !== "ORG_OWNER");
}

function normalizeOrgPartnerType(value: unknown): WorkplacePartnerType | null {
  if (value === "STORE" || value === "COMPANY") return value;
  return null;
}

export type WorkplacePartnerTypeResolution = {
  partnerType: WorkplacePartnerType | null;
  source: WorkplacePartnerTypeSource;
};

function resolvePersonalWorkplacePartnerType(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
): WorkplacePartnerType | null {
  if (user.role !== "PRO" || isPureAgentActivities(user.partnerActivities)) return null;
  return normalizeOrgPartnerType(user.partnerType);
}

/** Trusted active org context first; personal profile only for solo / org owner (not org staff employee). */
export function resolveWorkplacePartnerTypeResolution(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): WorkplacePartnerTypeResolution {
  const { user, proContext, contextReady } = input;
  const role = proContext?.role?.trim() ?? null;

  if (contextReady && proContext && validateProContextSnapshot(proContext).ok) {
    const orgPt = normalizeOrgPartnerType(proContext.organization?.partnerType);
    if (orgPt && isOrgWorkplaceMemberRole(role)) {
      return { partnerType: orgPt, source: "org-context" };
    }
  }

  const orgStaffEmployee =
    contextReady &&
    proContext &&
    validateProContextSnapshot(proContext).ok &&
    isOrgWorkplaceMemberRole(role) &&
    role !== "ORG_OWNER";

  if (orgStaffEmployee) {
    return { partnerType: null, source: null };
  }

  const personal = resolvePersonalWorkplacePartnerType(user);
  if (personal) {
    return { partnerType: personal, source: "personal-profile" };
  }

  if (role === "SOLO_PARTNER") {
    const soloPt = normalizeOrgPartnerType(proContext?.organization?.partnerType);
    if (soloPt) return { partnerType: soloPt, source: "org-context" };
  }

  return { partnerType: null, source: null };
}

export function resolveWorkplacePartnerType(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): WorkplacePartnerType | null {
  return resolveWorkplacePartnerTypeResolution(input).partnerType;
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
  const workplace = resolveWorkplacePartnerTypeResolution({
    user: input.user,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });
  const workplacePartnerType = workplace.partnerType;
  const navMode: CabinetNavMode = resolveCabinetNavMode(input.user, {
    workplacePartnerType,
    workplaceNavFromOrgContext: workplace.source === "org-context",
  });
  const actorDisplayName = input.user.displayName?.trim() || "Партнёр RemCard";

  return {
    contextReady: input.contextReady,
    contextHttpStatus: input.contextHttpStatus,
    proContext: input.proContext,
    workplacePartnerType,
    workplacePartnerTypeSource: workplace.source,
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
  const validation = validateProContextSnapshot(input.presentation.proContext);
  if (!validation.ok) return true;
  const role = input.presentation.proContext?.role;
  if (role && !isKnownProContextRole(role)) return true;
  if (isOrgWorkplaceMemberRole(role) && !input.presentation.workplacePartnerType) {
    return true;
  }
  return false;
}
