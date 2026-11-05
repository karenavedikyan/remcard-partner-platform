import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { deriveProfileCabinetAccess, ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { profileSectionNavLabels, businessOrgProfileSectionNav } from "@/lib/profile-section-access";
import type { ProProfileResponse } from "@/lib/types";

const remcardFetchMock = vi.fn();
let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/profile",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetchMock(...args),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, profileComplete: false }),
}));

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, hasAgentActivity: false }),
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => <div data-testid="notif-panel" />,
}));

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: () => <div data-testid="branches-section" />,
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => <div data-testid="team-section" />,
}));

vi.mock("./agent/AgentProfileSection", () => ({
  AgentProfileSection: () => <div data-testid="agent-profile-section" />,
}));

vi.mock("./business/BusinessProfileSection", () => ({
  BusinessProfileSection: () => <div data-testid="business-profile-section" />,
}));

vi.mock("./ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => <div data-testid="branch-switcher" />,
}));

vi.mock("./ProfileOverviewSection", () => ({
  ProfileOverviewSection: () => <div data-testid="overview-section" />,
}));

vi.mock("@/components/consent/ProfAnalyticsConsentUi", () => ({
  ProfAnalyticsConsentProfileSetting: () => null,
}));

const storeOwnerProfile: ProProfileResponse = {
  organization: {
    id: "org-owner",
    name: "Owner Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 1,
  },
  programs: [],
  user: {
    id: "owner-1",
    publicId: "RC-OWN",
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
    partnerActivities: ["STORE"],
  },
};

const staffProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "staff-1",
    publicId: "RC-ST",
    displayName: "Staff",
    city: "City",
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

function tabLabels(container: HTMLElement): string[] {
  const tablist = container.querySelector('[role="tablist"]');
  if (!tablist) return [];
  return within(tablist as HTMLElement)
    .getAllByRole("tab")
    .map((tab) => tab.textContent?.trim() ?? "");
}

describe("ProfileEditor org staff tab parity", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    remcardFetchMock.mockReset();
    remcardFetchMock.mockResolvedValue({ notes: [] });
  });

  it("matches owner STORE tab labels and order for org staff STORE and COMPANY", () => {
    const ownerAccess = ownerProfileCabinetAccess();
    const { container: ownerContainer, unmount: unmountOwner } = render(
      <ProfileEditor initial={storeOwnerProfile} cabinetAccess={ownerAccess} section="overview" />,
    );
    const ownerLabels = tabLabels(ownerContainer);
    unmountOwner();

    const storeStaffAccess = deriveProfileCabinetAccess({
      profile: staffProfile,
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    const { container: storeStaffContainer, unmount: unmountStoreStaff } = render(
      <ProfileEditor
        initial={staffProfile}
        cabinetAccess={storeStaffAccess}
        section="overview"
        orgStaffWorkplacePartnerType="STORE"
      />,
    );
    expect(tabLabels(storeStaffContainer)).toEqual(ownerLabels);
    expect(tabLabels(storeStaffContainer)).toEqual(
      profileSectionNavLabels(businessOrgProfileSectionNav()),
    );
    unmountStoreStaff();

    const companyStaffAccess = deriveProfileCabinetAccess({
      profile: staffProfile,
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o2", name: "Co", partnerType: "COMPANY" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: true,
          canFetchEmployeesOverview: true,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    const { container: companyStaffContainer } = render(
      <ProfileEditor
        initial={staffProfile}
        cabinetAccess={companyStaffAccess}
        section="overview"
        orgStaffWorkplacePartnerType="COMPANY"
      />,
    );
    expect(tabLabels(companyStaffContainer)).toEqual(ownerLabels);
  });

  it("shows access gate on locked tabs without privileged organization fetches", () => {
    const access = deriveProfileCabinetAccess({
      profile: staffProfile,
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });

    mockSearchParams = new URLSearchParams("section=catalog");
    render(
      <ProfileEditor
        initial={staffProfile}
        cabinetAccess={access}
        section="catalog"
        orgStaffWorkplacePartnerType="STORE"
      />,
    );

    expect(screen.getByTestId("profile-org-staff-editor")).toBeTruthy();
    expect(screen.queryByTestId("agent-profile-section")).toBeNull();

    const catalogTab = screen.getByRole("tab", { name: "Каталог RemCard" });
    expect(catalogTab.getAttribute("aria-disabled")).toBe("true");

    expect(screen.getByTestId("profile-section-access-denied").textContent).toMatch(
      /Нет доступа\. Обратитесь к владельцу\./,
    );

    const privilegedPaths = remcardFetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((path) => path.includes("/api/pro/organization"));
    expect(privilegedPaths).toEqual([]);
  });
});
