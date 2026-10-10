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

const ownerCtx: ProContextSnapshot = {
  role: "ORG_OWNER",
  organization: { id: "o1", name: "Shop" },
  branches: [{ id: "b1", name: "A", city: "C" }],
  activeBranch: null,
};

describe("deriveProfileCabinetAccess", () => {
  it("owner PRO with ready context may fetch overview and moderation notes", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("PRO"),
      proContext: ownerCtx,
      contextReady: true,
    });
    expect(access.canFetchEmployeesOverview).toBe(true);
    expect(access.canOpenTeamSection).toBe(true);
    expect(access.canFetchModerationNotes).toBe(true);
  });

  it("CLIENT org team member must not fetch overview or moderation notes", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("CLIENT"),
      proContext: {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "o1", name: "Shop" },
        branches: [{ id: "b1", name: "A", city: "C" }],
        activeBranch: { id: "b1", name: "A", city: "C" },
        branchRole: "SELLER",
      },
      contextReady: true,
    });
    expect(access.canFetchEmployeesOverview).toBe(false);
    expect(access.canOpenTeamSection).toBe(false);
    expect(access.canFetchModerationNotes).toBe(false);
  });

  it("PRO branch manager keeps team/overview fetch", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("PRO"),
      proContext: {
        role: "BRANCH_MANAGER",
        organization: { id: "o1", name: "Shop" },
        branches: [{ id: "b1", name: "A", city: "C" }],
        activeBranch: { id: "b1", name: "A", city: "C" },
      },
      contextReady: true,
    });
    expect(access.canFetchEmployeesOverview).toBe(true);
    expect(access.canOpenTeamSection).toBe(true);
  });

  it("blocks privileged fetches until context is ready", () => {
    const access = deriveProfileCabinetAccess({
      profile: profile("PRO"),
      proContext: ownerCtx,
      contextReady: false,
    });
    expect(access.canFetchEmployeesOverview).toBe(false);
    expect(access.canOpenTeamSection).toBe(false);
    expect(access.canFetchModerationNotes).toBe(true);
  });

  it("exposes stable team-block copy", () => {
    expect(blockedTeamSectionMessage()).toMatch(/Сотрудники/i);
  });
});
