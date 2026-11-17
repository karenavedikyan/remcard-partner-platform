import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

const backgroundMocks = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
  fetchSpecialistR06Status: vi.fn(),
  fetchAgentProfileStatus: vi.fn(),
}));

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
  remcardFetch: backgroundMocks.remcardFetch,
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
vi.mock("./PartnerTypeSettings", () => ({
  PartnerTypeSettings: () => <div data-testid="partner-type-settings" />,
}));
vi.mock("@/components/account-session/ProfileSessionActions", () => ({
  ProfileSessionActions: () => <button type="button">Выйти</button>,
}));
vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="profile-directions-picker" />,
}));
vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: backgroundMocks.fetchSpecialistR06Status,
}));
vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: backgroundMocks.fetchAgentProfileStatus,
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

async function drainMockResults(fn: ReturnType<typeof vi.fn>) {
  await Promise.all(fn.mock.results.map((result) => result.value));
}

async function drainProfileEditorBackgroundWork() {
  await waitFor(() => {
    expect(backgroundMocks.remcardFetch).toHaveBeenCalledWith("/api/pro/moderation-notes");
  });
  await act(async () => {
    await drainMockResults(backgroundMocks.remcardFetch);
    await drainMockResults(backgroundMocks.fetchSpecialistR06Status);
    await drainMockResults(backgroundMocks.fetchAgentProfileStatus);
  });
}

function mount(section: string, initial: ProProfileResponse = profile) {
  mockSearchParams = new URLSearchParams(`section=${section}`);
  return render(
    <CookieConsentProvider>
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={initial} />
    </CookieConsentProvider>,
  );
}

describe("ProfileEditor «Другие настройки» (M4)", () => {
  beforeEach(() => {
    localStorage.clear();
    backgroundMocks.remcardFetch.mockReset();
    backgroundMocks.fetchSpecialistR06Status.mockReset();
    backgroundMocks.fetchAgentProfileStatus.mockReset();
    backgroundMocks.remcardFetch.mockImplementation(async (path: string) => {
      if (path === "/api/pro/moderation-notes") {
        return { notes: [] };
      }
      throw new Error(`unexpected remcardFetch path in placement test: ${path}`);
    });
    backgroundMocks.fetchSpecialistR06Status.mockResolvedValue({
      featureEnabled: false,
      eligible: false,
      profileComplete: false,
    });
    backgroundMocks.fetchAgentProfileStatus.mockResolvedValue({
      featureEnabled: false,
      eligible: false,
      hasAgentActivity: false,
      profileComplete: false,
    });
  });

  afterEach(async () => {
    await act(async () => {
      await drainMockResults(backgroundMocks.remcardFetch);
      await drainMockResults(backgroundMocks.fetchSpecialistR06Status);
      await drainMockResults(backgroundMocks.fetchAgentProfileStatus);
    });
  });

  it("folds stats, partner type and sign-out into one line while the profile is not filled", async () => {
    const view = mount("basics");
    await drainProfileEditorBackgroundWork();
    const other = screen.getByTestId("profile-other-settings");
    expect(other.tagName).toBe("DETAILS");
    expect(other).not.toHaveAttribute("open");
    expect(other.querySelector("summary")?.textContent).toBe("Другие настройки");
    expect(other).toContainElement(screen.getByTestId("partner-type-settings"));
    expect(other).toContainElement(screen.getByTestId("analytics-consent-profile"));
    expect(other).toContainElement(screen.getByRole("button", { name: "Выйти" }));
    view.unmount();
    await drainProfileEditorBackgroundWork();
  });

  it("shows the blocks in full once the profile has a direction", async () => {
    const filled: ProProfileResponse = {
      ...profile,
      user: { ...profile.user, specializations: ["doors"] },
    };
    const view = mount("overview", filled);
    await drainProfileEditorBackgroundWork();
    expect(screen.queryByTestId("profile-other-settings")).toBeNull();
    expect(screen.getByTestId("partner-type-settings")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-consent-profile")).toBeInTheDocument();
    view.unmount();
    await drainProfileEditorBackgroundWork();
  });
});
