/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("section=basics"),
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

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: vi.fn(),
  };
});

vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
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

function companyProfile(): ProProfileResponse {
  return {
    organization: {
      id: "org-co",
      name: "Компания Юг",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 1,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: ["doors"],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: ["doors"],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    catalogPublication: { catalogEntity: "organization", isLivePublic: false },
    user: {
      id: "u-co",
      publicId: "RC-CO",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
      partnerActivities: ["COMPANY"],
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

describe("ProfileEditor business wizard dirty guard", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("confirms before catalog tab when business wizard has unsaved rep name", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <ProfileEditor
        cabinetAccess={ownerProfileCabinetAccess()}
        initial={companyProfile()}
        section="basics"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    const rep = screen.getByLabelText(/Имя представителя/i);
    await user.clear(rep);
    await user.type(rep, "Новый представитель");

    pushMock.mockClear();
    await user.click(screen.getByRole("tab", { name: /Каталог RemCard/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(rep).toHaveValue("Новый представитель");
  });
});
