/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { remcardFetch } from "@/lib/api-client";
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

function storeWithOrg(overrides?: Partial<ProProfileResponse["organization"]>): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин Тест",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 0,
      publicCatalogBranchId: "branch-a",
      publicCatalogCity: "Анапа",
      storeCategories: [],
      specializations: [],
      ...overrides,
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
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/moderation-notes") return { notes: [] };
      throw new Error(`Unexpected ${String(path)} ${init?.method ?? "GET"}`);
    });
  });

  it("shows five-step organization catalog wizard for store owner with org", async () => {
    render(
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={storeWithOrg()} />,
    );
    expect(await screen.findByTestId("organization-catalog-wizard")).toBeInTheDocument();
    expect(screen.getByText("Подключение к каталогу")).toBeInTheDocument();
    expect(screen.queryByText(/профиль специалиста/i)).not.toBeInTheDocument();
  });

  it("keeps unsaved public org name when catalog branch pin changes (STORE)", async () => {
    const initial = storeWithOrg({
      branchCount: 2,
      publicCatalogBranchId: "branch-a",
    });
    const refreshed = storeWithOrg({
      branchCount: 2,
      publicCatalogBranchId: "branch-b",
      publicCatalogCity: "Москва",
    });
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/moderation-notes") return { notes: [] };
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return {
          organization: {
            branches: [
              { id: "branch-a", name: "A", city: "Анапа", address: "1", isActive: true },
              { id: "branch-b", name: "B", city: "Москва", address: "2", isActive: true },
            ],
          },
        };
      }
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return refreshed;
      }
      throw new Error(`Unexpected ${String(path)} ${init?.method ?? "GET"}`);
    });

    const ui = userEvent.setup();
    render(<ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={initial} />);
    const nameInput = await screen.findByTestId("catalog-public-name");
    await ui.clear(nameInput);
    await ui.type(nameInput, "Несохранённый публичный черновик");
    const select = await screen.findByTestId("catalog-public-branch-select");
    await ui.selectOptions(select, "branch-b");
    await waitFor(() =>
      expect((nameInput as HTMLInputElement).value).toBe("Несохранённый публичный черновик"),
    );
  });

  it("keeps unsaved public org name when catalog branch pin changes (COMPANY)", async () => {
    const initial = storeWithOrg({
      branchCount: 2,
      partnerType: "COMPANY",
      publicCatalogBranchId: "branch-a",
    });
    initial.user.partnerType = "COMPANY";
    initial.user.partnerActivities = ["COMPANY"];
    const refreshed = {
      ...initial,
      organization: {
        ...initial.organization!,
        publicCatalogBranchId: "branch-b",
        publicCatalogCity: "Москва",
      },
    };
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/moderation-notes") return { notes: [] };
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return {
          organization: {
            branches: [
              { id: "branch-a", name: "A", city: "Анапа", address: "1", isActive: true },
              { id: "branch-b", name: "B", city: "Москва", address: "2", isActive: true },
            ],
          },
        };
      }
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return refreshed;
      }
      throw new Error(`Unexpected ${String(path)} ${init?.method ?? "GET"}`);
    });

    const ui = userEvent.setup();
    render(<ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={initial} />);
    const nameInput = await screen.findByTestId("catalog-public-name");
    await ui.clear(nameInput);
    await ui.type(nameInput, "Несохранённый публичный черновик");
    await ui.selectOptions(await screen.findByTestId("catalog-public-branch-select"), "branch-b");
    await waitFor(() =>
      expect((nameInput as HTMLInputElement).value).toBe("Несохранённый публичный черновик"),
    );
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
