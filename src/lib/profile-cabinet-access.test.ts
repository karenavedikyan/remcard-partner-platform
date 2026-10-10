import { describe, expect, it } from "vitest";
import {
  blockedTeamSectionMessage,
  deriveProfileCabinetAccess,
  type ProContextSnapshot,
} from "./profile-cabinet-access";
import type { ProProfileResponse } from "./types";

function profile(role: string, partnerType = "STORE"): ProProfileResponse {
  return {
    organization: {
      id: "o1",
      name: "Shop",
      catalogStatus: "DRAFT",
      partnerType,
      branchCount: 1,
    },
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Rep",
      city: "City",
      specializations: [],
      role,
      partnerType,
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
  };
}

describe("deriveProfileCabinetAccess", () => {
  it("uses server teamCapabilities for CLIENT team manager", () => {
    const proContext: ProContextSnapshot = {
      role: "ORG_TEAM_MEMBER",
      organization: { id: "o1", name: "Shop" },
      branches: [{ id: "bA", name: "A", city: "C" }],
      teamCapabilities: {
        canOpenTeamSection: true,
        canFetchEmployeesOverview: true,
        canManageEmployeesByBranchId: { bA: true },
      },
    };
    const access = deriveProfileCabinetAccess({
      profile: profile("CLIENT"),
      proContext,
      contextReady: true,
    });
    expect(access.canFetchEmployeesOverview).toBe(true);
    expect(access.canOpenTeamSection).toBe(true);
    expect(access.canFetchModerationNotes).toBe(false);
  });

  it("CLIENT scan-only without teamCapabilities cannot open team", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("CLIENT"),
      proContext: {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "o1", name: "Shop" },
        branches: [{ id: "bA", name: "A", city: "C" }],
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    expect(access.canOpenTeamSection).toBe(false);
    expect(access.canFetchModerationNotes).toBe(false);
  });

  it("owner PRO keeps moderation notes without team coupling", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("PRO"),
      proContext: {
        role: "ORG_OWNER",
        teamCapabilities: {
          canOpenTeamSection: true,
          canFetchEmployeesOverview: true,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    expect(access.canFetchModerationNotes).toBe(true);
  });

  it("blocks team until context is ready", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("PRO"),
      proContext: {
        role: "ORG_OWNER",
        teamCapabilities: {
          canOpenTeamSection: true,
          canFetchEmployeesOverview: true,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: false,
    });
    expect(access.canFetchEmployeesOverview).toBe(false);
    expect(access.canFetchModerationNotes).toBe(true);
  });

  it("exposes stable team-block copy", () => {
    expect(blockedTeamSectionMessage()).toMatch(/Сотрудники/i);
  });
});
