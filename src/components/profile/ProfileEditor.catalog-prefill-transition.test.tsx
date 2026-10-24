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

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
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

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "mount", label: "Монтаж" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ notes: [] }),
  RemcardApiError: class RemcardApiError extends Error {},
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

vi.mock("./OrganizationCatalogPublicBranchSelector", () => ({
  OrganizationCatalogPublicBranchSelector: () => null,
}));

function businessOrgProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: {
      id: `org-${partnerType.toLowerCase()}`,
      name: partnerType === "STORE" ? "Магазин Синт" : "Компания Синт",
      catalogStatus: "DRAFT",
      partnerType,
      branchCount: 0,
      publicCatalogCity: "",
      storeCategories: [],
      specializations: [],
      website: "",
      telegram: "",
      publicEmail: "",
      publicPhone: "",
    },
    programs: [],
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    workingProfile: {
      productCategoryIds: ["doors"],
      serviceSpecializationIds: ["mount"],
      navigatorStageIds: ["L1-7"],
      effectiveProductCategoryIds: ["doors"],
      effectiveServiceSpecializationIds: ["mount"],
      effectiveNavigatorStageIds: ["L1-7"],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingProductDirectionsTouched: false,
      workingServiceDirectionsTouched: false,
      workingNavigatorStagesTouched: false,
      partnerWorkMode: "ON_SITE",
      areas: [],
      partnershipContactName: "Представитель",
      partnershipContactPhone: "+79001234567",
      partnershipContactEmail: "partner@example.com",
    },
    user: {
      id: `u-${partnerType.toLowerCase()}`,
      role: "PRO",
      partnerType,
      partnerActivities: [partnerType],
      displayName: "Представитель",
      city: "Сочи",
      catalogCity: "",
      catalogStatus: "DRAFT",
      publicId: "RC-PREFILL",
      specializations: [],
      storeCategories: [],
      website: "https://org-working.example",
      telegram: "@org_working",
    },
  } as ProProfileResponse;
}

describe("ProfileEditor working profile → org catalog prefill", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    pushMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/pro/moderation-notes") return { notes: [] };
      throw new Error(`Unexpected ${String(path)}`);
    });
  });

  it.each(["STORE", "COMPANY"] as const)(
    "prefills catalog wizard from saved working profile on catalog section (%s)",
    async (partnerType) => {
      mockSearchParams = new URLSearchParams("section=catalog");
      render(
        <ProfileEditor
          cabinetAccess={ownerProfileCabinetAccess()}
          initial={businessOrgProfile(partnerType)}
          section="catalog"
        />,
      );

      const ui = userEvent.setup();
      const nameInput = await screen.findByTestId("catalog-public-name");
      expect((nameInput as HTMLInputElement).value).toBe(
        partnerType === "STORE" ? "Магазин Синт" : "Компания Синт",
      );

      const cityInput = screen.getByTestId("catalog-city-input");
      expect((cityInput as HTMLInputElement).value).toBe("Сочи");
      await ui.type(screen.getByLabelText(/Адрес первого филиала/i), "ул. Тестовая, 1");

      await ui.click(screen.getByRole("button", { name: "Далее" }));
      await waitFor(() =>
        expect(screen.getByRole("checkbox", { name: /Инженерия/i })).toBeInTheDocument(),
      );
      expect(screen.getByRole("checkbox", { name: /Инженерия/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Двери/i })).toBeChecked();

      await ui.click(screen.getByRole("button", { name: "Далее" }));
      await waitFor(() => expect(screen.getByText("Публичные контакты")).toBeInTheDocument());
      expect(screen.getByDisplayValue("partner@example.com")).toBeInTheDocument();
      expect((screen.getByLabelText(/Телефон/i) as HTMLInputElement).value).toMatch(/900.*123.*45.*67/);
    },
  );

  it("re-applies prefill after applyProfile when org catalog slice is still empty", async () => {
    mockSearchParams = new URLSearchParams("section=catalog");
    const initial = businessOrgProfile("STORE");
    const { rerender } = render(
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={initial} section="catalog" />,
    );
    const ui = userEvent.setup();
    await screen.findByTestId("catalog-public-name");
    await ui.type(screen.getByLabelText(/Адрес первого филиала/i), "ул. Тестовая, 1");
    expect((screen.getByTestId("catalog-city-input") as HTMLInputElement).value).toBe("Сочи");

    rerender(
      <ProfileEditor cabinetAccess={ownerProfileCabinetAccess()} initial={initial} section="catalog" />,
    );

    await waitFor(() =>
      expect((screen.getByTestId("catalog-city-input") as HTMLInputElement).value).toBe("Сочи"),
    );
  });

  it("navigates to catalog via tab without full reload (router push)", async () => {
    mockSearchParams = new URLSearchParams("");
    const ui = userEvent.setup();
    render(
      <ProfileEditor
        cabinetAccess={ownerProfileCabinetAccess()}
        initial={businessOrgProfile("STORE")}
        section="basics"
      />,
    );
    await ui.click(screen.getByRole("tab", { name: "Каталог RemCard" }));
    expect(pushMock).toHaveBeenCalledWith("/profile?section=catalog", { scroll: false });
  });
});
