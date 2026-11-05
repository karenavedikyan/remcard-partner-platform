import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { deriveProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { companyOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";
import type { ProProfileResponse } from "@/lib/types";

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
  remcardFetch: vi.fn().mockResolvedValue({ notes: [] }),
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

vi.mock("./PartnerTypeSettings", () => ({
  PartnerTypeSettings: () => <div data-testid="partner-type-settings" />,
}));

vi.mock("./ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => <div data-testid="branch-switcher" />,
}));

vi.mock("@/components/consent/ProfAnalyticsConsentUi", () => ({
  ProfAnalyticsConsentProfileSetting: () => null,
}));

function tabLabels(): string[] {
  const tablist = screen.getByRole("tablist");
  return within(tablist)
    .getAllByRole("tab")
    .map((tab) => tab.textContent?.trim() ?? "");
}

describe("ProfileEditor org staff workplace guards", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
  });

  it("shows full tab strip for PRO AGENT employee without agent nav pending", () => {
    const profile: ProProfileResponse = {
      organization: null,
      programs: [],
      user: {
        id: "pro-agent-staff",
        publicId: "RC-PA",
        displayName: "Agent Staff",
        city: "City",
        specializations: [],
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
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

    const access = deriveProfileCabinetAccess({
      profile,
      proContext: companyOrgEmployeeContext,
      contextReady: true,
    });

    render(
      <ProfileEditor
        initial={profile}
        cabinetAccess={access}
        section="overview"
        orgStaffWorkplacePartnerType="COMPANY"
        initialAgentR02Gate={null}
      />,
    );

    expect(screen.queryByTestId("profile-nav-pending")).toBeNull();
    expect(tabLabels().length).toBe(6);
    expect(screen.queryByTestId("agent-profile-section")).toBeNull();
    expect(screen.queryByTestId("partner-type-settings")).toBeNull();
    expect(screen.queryByText(/Пусть новые клиенты найдут вас/i)).toBeNull();
  });

  it("allows personal notification settings tab for org workplace employee", () => {
    const profile: ProProfileResponse = {
      organization: null,
      programs: [],
      user: {
        id: "staff-notify",
        publicId: "RC-N",
        displayName: "Staff",
        city: "City",
        specializations: [],
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
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

    const access = deriveProfileCabinetAccess({
      profile,
      proContext: companyOrgEmployeeContext,
      contextReady: true,
    });

    mockSearchParams = new URLSearchParams("section=notifications");
    render(
      <ProfileEditor
        initial={profile}
        cabinetAccess={access}
        section="notifications"
        orgStaffWorkplacePartnerType="COMPANY"
      />,
    );

    const notificationsTab = screen.getByRole("tab", { name: "Уведомления" });
    expect(notificationsTab.getAttribute("aria-disabled")).not.toBe("true");
    expect(screen.getByTestId("notif-panel")).toBeTruthy();
    expect(screen.queryByTestId("profile-section-access-denied")).toBeNull();
  });

  it("never surfaces personal organization in overview or aside for workplace employee", () => {
    const profile: ProProfileResponse = {
      organization: {
        id: "own-personal-org",
        name: "Личная организация сотрудника",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 3,
        catalogPublished: true,
        catalogDraft: false,
      },
      programs: [],
      user: {
        id: "pro-store-staff",
        publicId: "RC-PS",
        displayName: "Store Staff",
        city: "City",
        specializations: [],
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        description: null,
        catalogStatus: "APPROVED",
        isPublic: true,
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

    const access = deriveProfileCabinetAccess({
      profile,
      proContext: companyOrgEmployeeContext,
      contextReady: true,
    });

    render(
      <ProfileEditor
        initial={profile}
        cabinetAccess={access}
        section="overview"
        orgStaffWorkplacePartnerType="COMPANY"
      />,
    );

    expect(screen.queryByText("Личная организация сотрудника")).toBeNull();
    expect(screen.queryByTestId("partner-type-settings")).toBeNull();
    expect(screen.queryByText(/Подготовить публикацию/i)).toBeNull();
    expect(screen.queryByText(/Филиалов: 3/i)).toBeNull();
    expect(screen.getByTestId("workplace-aside-org-name").textContent).toBe(
      "Синтетическая компания",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Синтетическая компания" })).toBeTruthy();
  });
});
