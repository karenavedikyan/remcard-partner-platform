/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    services: [{ kind: "service", id: "plumbing", label: "Сантехника" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: vi.fn(),
  };
});

function profile(): ProProfileResponse {
  return {
    organization: {
      id: "org-1",
      name: "СтройКомпания",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 1,
      website: "https://example.ru",
      telegram: "@company",
    },
    programs: [],
    workingProfile: {
      productCategoryIds: ["doors"],
      serviceSpecializationIds: ["plumbing"],
      navigatorStageIds: ["L1-7"],
      effectiveProductCategoryIds: ["doors"],
      effectiveServiceSpecializationIds: ["plumbing"],
      effectiveNavigatorStageIds: ["L1-7"],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      partnerWorkMode: "BOTH",
      areas: ["Krasnodar"],
      partnershipContactName: "Мария",
      partnershipContactPhone: "+79991234567",
      partnershipContactEmail: "a@example.com",
    },
    user: {
      id: "u1",
      publicId: "RC-1",
      displayName: "Director",
      city: "Krasnodar",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
      description: null,
      catalogStatus: "DRAFT",
      isPublic: false,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: "https://example.ru",
      telegram: "@company",
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

describe("BusinessWorkingProfileWizard review facts", () => {
  it("shows filled website, telegram, contact person, work mode and areas on step 4", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={profile()}
        partnerType="COMPANY"
        basicsEditable
        forceEditing
        forceStep={3}
      />,
    );

    const panel = await screen.findByTestId("business-profile-review-panel");
    await waitFor(() => expect(panel.textContent).toMatch(/example\.ru/));
    expect(panel.textContent).toMatch(/@company/);
    expect(panel.textContent).toMatch(/Мария/);
    expect(panel.textContent).toMatch(/По адресу и на выезде/);
    expect(panel.textContent).toMatch(/Krasnodar/);
    await waitFor(() => expect(panel.textContent).toMatch(/Товар: Двери/));
    expect(panel.textContent).toMatch(/Услуга: Сантехника/);
  });
});
