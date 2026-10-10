import type { ProProfileResponse } from "@/lib/types";

/** Subset of GET /api/pro/context used for profile UI gates (no privileged fetches before ready). */
export type TeamCapabilitiesSnapshot = {
  canOpenTeamSection: boolean;
  canFetchEmployeesOverview: boolean;
  canManageEmployeesByBranchId: Record<string, boolean>;
};

export type ProContextSnapshot = {
  role: string;
  branches?: Array<{ id: string; name: string; city: string }>;
  activeBranch?: { id: string; name: string; city: string } | null;
  organization?: { id: string; name: string } | null;
  branchRole?: string | null;
  membershipKind?: string | null;
  teamCapabilities?: TeamCapabilitiesSnapshot;
};

export type ProfileCabinetAccess = {
  /** Server (or switcher) resolved GET /api/pro/context successfully. */
  contextReady: boolean;
  proContext: ProContextSnapshot | null;
  teamCapabilities: TeamCapabilitiesSnapshot | null;
  /**
   * May call GET /api/pro/organization/employees-overview (scoped on server).
   * View vs manage is decided from overview payload (`canManageTeam`), not here.
   */
  canFetchEmployeesOverview: boolean;
  /** Team tab may load roster / management UI. */
  canOpenTeamSection: boolean;
  /** May call GET /api/pro/moderation-notes (PRO catalog actors only; not tied to team). */
  canFetchModerationNotes: boolean;
};

export function deriveProfileCabinetAccess(input: {
  profile: ProProfileResponse;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): ProfileCabinetAccess {
  const { profile, proContext, contextReady } = input;
  const team = proContext?.teamCapabilities ?? null;

  const canFetchEmployeesOverview =
    contextReady && team?.canFetchEmployeesOverview === true;
  const canOpenTeamSection = contextReady && team?.canOpenTeamSection === true;
  const canFetchModerationNotes = profile.user.role === "PRO";

  return {
    contextReady,
    proContext,
    teamCapabilities: team,
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
    teamCapabilities: {
      canOpenTeamSection: true,
      canFetchEmployeesOverview: true,
      canManageEmployeesByBranchId: {},
    },
  },
): ProfileCabinetAccess {
  return deriveProfileCabinetAccess({
    profile: {
      organization: null,
      programs: [],
      user: {
        id: "u1",
        publicId: "RC1",
        displayName: "Owner",
        city: "City",
        specializations: [],
        role: "PRO",
        partnerType: "STORE",
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    },
    proContext,
    contextReady: true,
  });
}

export function blockedTeamSectionMessage(): string {
  return "Раздел «Сотрудники» недоступен для вашей роли или набора прав.";
}
