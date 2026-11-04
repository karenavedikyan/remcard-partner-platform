import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

let mockSearchParams = new URLSearchParams("section=overview");

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

vi.mock("@/lib/profile-working-save", () => ({
  persistWorkingProfileDraft: vi.fn(),
  validateWorkingProfileDraft: vi.fn(() => null),
  workingProfileMissingFields: vi.fn(() => []),
  workingProfileCabinetReady: vi.fn(() => true),
  workingProfileComplete: vi.fn(() => true),
}));

vi.mock("@/lib/profile-save", () => ({
  persistProfileDraft: vi.fn(),
  submitProfileForModerationReview: vi.fn(),
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

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => null,
}));
vi.mock("./ProfileBranchesSection", () => ({ ProfileBranchesSection: () => null }));
vi.mock("./ProfileTeamSection", () => ({ ProfileTeamSection: () => null }));
vi.mock("./specialist/SpecialistProfileSection", () => ({
  SpecialistProfileSection: () => null,
}));
vi.mock("./specialist/SpecialistCatalogSection", () => ({ SpecialistCatalogSection: () => null }));
vi.mock("./agent/AgentProfileSection", () => ({ AgentProfileSection: () => null }));
vi.mock("./business/BusinessProfileSection", () => ({ BusinessProfileSection: () => null }));
vi.mock("./ProfileOverviewSection", () => ({ ProfileOverviewSection: () => null }));
vi.mock("./ProfileBranchContextSwitcher", () => ({ ProfileBranchContextSwitcher: () => null }));
vi.mock("./PartnerTypeSettings", () => ({ PartnerTypeSettings: () => null }));
vi.mock("./ProfileSessionActions", () => ({ ProfileSessionActions: () => null }));
vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({ enabled: false, eligible: false, hasSpecialistActivity: false }),
}));
vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, hasAgentActivity: false, eligible: false }),
}));

const profile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Москва",
    specializations: [],
    role: "PRO",
    partnerType: "MASTER",
    description: null,
    catalogStatus: "PENDING",
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

function mount(section: string) {
  mockSearchParams = new URLSearchParams(`section=${section}`);
  return render(
    <CookieConsentProvider>
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={profile} />
    </CookieConsentProvider>,
  );
}

describe("ProfileEditor analytics consent placement", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows a single inset on overview and basics, not on catalog", () => {
    const { unmount } = mount("overview");
    expect(screen.getAllByTestId("analytics-consent-profile")).toHaveLength(1);
    unmount();

    mount("basics");
    expect(screen.getAllByTestId("analytics-consent-profile")).toHaveLength(1);
  });

  it("hides analytics consent on unrelated profile tabs", () => {
    mount("catalog");
    expect(screen.queryByTestId("analytics-consent-profile")).toBeNull();
  });
});
