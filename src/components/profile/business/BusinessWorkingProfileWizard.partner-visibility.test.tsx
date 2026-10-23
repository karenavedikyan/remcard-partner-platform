/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [],
    stages: [],
  })),
}));

const persist = vi.fn();

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: (...args: unknown[]) => persist(...args),
  };
});

function storeProfile(working: Partial<ProProfileResponse["workingProfile"]>): ProProfileResponse {
  return {
    organization: {
      id: "org-1",
      name: "Магазин Юг",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
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
      partnerSearchVisible: true,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      partnerWorkMode: "BOTH",
      areas: [],
      partnershipContactName: "Алексей",
      partnershipContactPhone: "+79001112233",
      partnershipContactEmail: "a@b.c",
      ...working,
    },
    user: {
      id: "u1",
      publicId: "RC-1",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
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

describe("BusinessWorkingProfileWizard partner visibility", () => {
  beforeEach(() => {
    persist.mockReset();
    persist.mockImplementation(async (profile: ProProfileResponse, draft) => ({
      ...profile,
      workingProfile: {
        ...profile.workingProfile!,
        partnerSearchOptIn: draft.partnerSearchOptIn,
        partnerSearchOptInExplicit: true,
        partnerSearchVisible: draft.partnerSearchOptIn,
      },
    }));
  });

  it("shows toggle on review step with prototype copy", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={storeProfile({})}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={3}
      />,
    );
    expect(await screen.findByTestId("business-partner-search-opt-in")).toBeTruthy();
    expect(screen.getByText("Показывать профиль партнёрам")).toBeTruthy();
    expect(
      screen.getByText(/Поиск внутри RemCard\. Это не публикация в каталоге для клиентов\./),
    ).toBeTruthy();
  });

  it("sends partnerSearchOptIn only after explicit toggle", async () => {
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={storeProfile({ partnerSearchOptInExplicit: true, partnerSearchOptIn: false })}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={3}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^Сохранить$/ }));
    await waitFor(() => expect(persist).toHaveBeenCalled());
    expect(persist.mock.calls[0][2]).toEqual({ partnerSearchTouched: false });

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^Сохранить$/ }));
    await waitFor(() => expect(persist.mock.calls.length).toBe(2));
    expect(persist.mock.calls[1][2]).toEqual({ partnerSearchTouched: true });
    expect(persist.mock.calls[1][1].partnerSearchOptIn).toBe(true);
  });

  it("disables toggle when basics are readonly", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={storeProfile({})}
        partnerType="STORE"
        basicsEditable={false}
        forceEditing
        forceStep={3}
      />,
    );
    expect(await screen.findByRole("checkbox")).toBeDisabled();
  });
});
