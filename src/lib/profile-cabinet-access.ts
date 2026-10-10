import type { ProProfileResponse } from "@/lib/types";

/** Subset of GET /api/pro/context used for profile UI gates (no privileged fetches before ready). */
export type ProContextSnapshot = {
  role: string;
  branches?: Array<{ id: string; name: string; city: string }>;
  activeBranch?: { id: string; name: string; city: string } | null;
  organization?: { id: string; name: string } | null;
  branchRole?: string | null;
  membershipKind?: string | null;
};

export type ProfileCabinetAccess = {
  /** Server (or switcher) resolved GET /api/pro/context successfully. */
  contextReady: boolean;
  proContext: ProContextSnapshot | null;
  /**
   * May call GET /api/pro/organization/employees-overview (navigator uses getProUser → PRO only).
   * View vs manage is decided from overview payload (`canManageTeam`), not here.
   */
  canFetchEmployeesOverview: boolean;
  /** Team tab may load roster / management UI (same upstream gate as overview fetch). */
  canOpenTeamSection: boolean;
  /** May call GET /api/pro/moderation-notes (PRO catalog actors only). */
  canFetchModerationNotes: boolean;
};

const OVERVIEW_CONTEXT_ROLES = new Set([
  "ORG_OWNER",
  "BRANCH_MANAGER",
  "SOLO_PARTNER",
  "PARTNER_OWNER",
  "PARTNER_EMPLOYEE",
  "ORG_EMPLOYEE",
]);

export function deriveProfileCabinetAccess(input: {
  profile: ProProfileResponse;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): ProfileCabinetAccess {
  const { profile, proContext, contextReady } = input;
  const isProUser = profile.user.role === "PRO";
  const ctxRole = proContext?.role ?? null;

  const canFetchEmployeesOverview =
    contextReady &&
    isProUser &&
    (ctxRole ? OVERVIEW_CONTEXT_ROLES.has(ctxRole) : false);

  const canOpenTeamSection = canFetchEmployeesOverview;
  const canFetchModerationNotes = isProUser;

  return {
    contextReady,
    proContext,
    canFetchEmployeesOverview,
    canOpenTeamSection,
    canFetchModerationNotes,
  };
}

/** Dev fixture / tests: org owner with loaded context. */
export function ownerProfileCabinetAccess(
  proContext: ProContextSnapshot | null = {
    role: "ORG_OWNER",
    organization: { id: "org1", name: "Org" },
    branches: [],
    activeBranch: null,
  },
): ProfileCabinetAccess {
  return {
    contextReady: true,
    proContext,
    canFetchEmployeesOverview: true,
    canOpenTeamSection: true,
    canFetchModerationNotes: true,
  };
}

export function blockedTeamSectionMessage(): string {
  return "Раздел «Сотрудники» недоступен для вашей роли или набора прав.";
}
