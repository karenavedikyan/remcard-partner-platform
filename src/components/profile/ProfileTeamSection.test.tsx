import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTeamSection } from "./ProfileTeamSection";
import { ProfileCabinetAccessProvider } from "./ProfileCabinetAccessContext";
import {
  deriveProfileCabinetAccess,
  ownerProfileCabinetAccess,
} from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("./ProfileTeamInviteWizard", () => ({
  ProfileTeamInviteWizard: () => null,
}));

const storeProfile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 1,
  },
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Rep",
    city: "City",
    specializations: [],
    role: "CLIENT",
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
};

describe("ProfileTeamSection access gates", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows access restriction without calling employees-overview", async () => {
    const access = deriveProfileCabinetAccess({
      profile: storeProfile,
      proContext: {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "o1", name: "Shop" },
        branches: [{ id: "b1", name: "A", city: "C" }],
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    render(
      <ProfileCabinetAccessProvider value={access}>
        <ProfileTeamSection />
      </ProfileCabinetAccessProvider>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/Сотрудники/i);
    await waitFor(() => {
      expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
    });
  });

  it("loads overview for org owner", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      organization: { id: "o1", name: "Shop" },
      myRole: "ORG_OWNER",
      myBranchIds: [],
      summary: {
        totalEmployees: 0,
        byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
        pendingInvites: 0,
      },
      branches: [],
      viewer: { userId: "u1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
    });
    render(
      <ProfileCabinetAccessProvider value={ownerProfileCabinetAccess()}>
        <ProfileTeamSection />
      </ProfileCabinetAccessProvider>,
    );
    await waitFor(() => {
      expect(vi.mocked(remcardFetch)).toHaveBeenCalledWith(
        "/api/pro/organization/employees-overview",
      );
    });
  });
});
