import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileOverviewSection } from "./ProfileOverviewSection";
import { ProfileCabinetAccessProvider } from "./ProfileCabinetAccessContext";
import { deriveProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

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

const staffProfile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "ОПТОВИК",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 6,
  },
  programs: [],
  user: {
    id: "u-staff",
    publicId: "RC-ST",
    displayName: "Staff",
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

describe("ProfileOverviewSection staff scope UI", () => {
  it("shows scope headline, expandable branch list, and working branch separately", async () => {
    const branches = Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`,
      name: `F${i + 1}`,
      city: "K",
      address: `addr ${i}`,
    }));
    const access = deriveProfileCabinetAccess({
      profile: staffProfile,
      proContext: {
        role: "BRANCH_EMPLOYEE",
        organization: { id: "o1", name: "ОПТОВИК" },
        membershipKind: "HEAD_OFFICE",
        membershipPosition: "Lead",
        branches,
        activeBranch: branches[0]!,
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
        <ProfileOverviewSection profile={staffProfile} onNavigateSection={() => {}} />
      </ProfileCabinetAccessProvider>,
    );

    expect(screen.getByTestId("staff-access-scope-headline")).toHaveTextContent(
      "Головной офис и 6 филиалов",
    );
    expect(screen.getByTestId("staff-working-branch")).toHaveTextContent("F1 — addr 0");

    const details = screen.getByTestId("staff-access-scope-branches");
    expect(details).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText(/Список филиалов \(6\)/));
    expect(screen.getByText("F6 — addr 5")).toBeInTheDocument();
  });
});
