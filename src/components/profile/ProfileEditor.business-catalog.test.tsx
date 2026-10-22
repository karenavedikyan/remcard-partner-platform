/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("section=catalog"),
  usePathname: () => "/profile",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, profileComplete: false }),
}));

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, hasAgentActivity: false }),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ notes: [] }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="mock-directions-picker" />,
}));

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: () => null,
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => null,
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => null,
}));

vi.mock("./agent/AgentProfileSection", () => ({
  AgentProfileSection: () => null,
}));

vi.mock("./ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => null,
}));

vi.mock("./ProfileOverviewSection", () => ({
  ProfileOverviewSection: () => null,
}));

function storeWithOrg(): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин Тест",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 0,
      storeCategories: [],
      specializations: [],
    },
    programs: [],
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      primaryDirection: null,
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingProductDirectionsTouched: false,
      workingServiceDirectionsTouched: false,
      workingNavigatorStagesTouched: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u-store",
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      displayName: "Иван",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC-TEST",
      specializations: [],
      storeCategories: [],
    },
  } as ProProfileResponse;
}

describe("ProfileEditor business catalog", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows five-step organization catalog wizard for store owner with org", async () => {
    render(
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={storeWithOrg()} />,
    );
    expect(await screen.findByTestId("organization-catalog-wizard")).toBeInTheDocument();
    expect(screen.getByText("Подключение к каталогу")).toBeInTheDocument();
    expect(screen.queryByText(/профиль специалиста/i)).not.toBeInTheDocument();
  });

  it("directs store owner without org to basics before catalog", async () => {
    const noOrg = { ...storeWithOrg(), organization: null };
    render(
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={noOrg} />,
    );
    expect(await screen.findByTestId("business-catalog-go-basics")).toBeInTheDocument();
    expect(screen.queryByTestId("organization-catalog-wizard")).not.toBeInTheDocument();
  });
});
