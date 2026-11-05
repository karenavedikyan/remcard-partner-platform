import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileOrgStaffWorkplace } from "./ProfileOrgStaffWorkplace";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/components/profile/ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => <div data-testid="branch-switcher" />,
}));

vi.mock("@/components/profile/ProfileTeamSection", () => ({
  ProfileTeamSection: () => <div data-testid="team-section" />,
}));

const profile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "staff-1",
    publicId: "RC-STAFF",
    displayName: "Сотрудник",
    city: "Krasnodar",
    specializations: [],
    role: "CLIENT",
    partnerType: null,
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

describe("ProfileOrgStaffWorkplace", () => {
  it("shows org context overview without owner organization on profile payload", () => {
    const access = ownerProfileCabinetAccess({
      role: "ORG_EMPLOYEE",
      organization: { id: "org-1", name: "Синтетическая org", partnerType: "STORE" },
      branches: [],
      activeBranch: null,
      teamCapabilities: {
        canOpenTeamSection: false,
        canFetchEmployeesOverview: false,
        canManageEmployeesByBranchId: {},
      },
    });
    render(
      <ProfileOrgStaffWorkplace
        initial={profile}
        cabinetAccess={access}
        partnerType="STORE"
        section="overview"
      />,
    );
    expect(screen.getByTestId("profile-org-staff-workplace")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Синтетическая org" })).toBeTruthy();
    expect(screen.getByText(/не из личного профиля владельца/i)).toBeTruthy();
  });
});
