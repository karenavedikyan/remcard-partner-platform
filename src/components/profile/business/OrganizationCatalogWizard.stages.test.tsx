/**
 * @vitest-environment jsdom
 */
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrganizationCatalogWizard } from "./OrganizationCatalogWizard";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "doors", label: "Монтаж дверей" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./OrganizationCatalogPublicBranchSelector", () => ({
  OrganizationCatalogPublicBranchSelector: () => null,
}));

function baseProfile(): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 1,
      publicCatalogBranchId: "br-1",
      publicCatalogCity: "Краснодар",
      storeCategories: [],
      specializations: [],
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    programs: [],
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
      id: "u1",
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      displayName: "Rep",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC1",
      specializations: [],
      storeCategories: [],
    },
  } as ProProfileResponse;
}

function WizardHarness(props: { partnerType: "STORE" | "COMPANY" }) {
  const profile = {
    ...baseProfile(),
    organization: {
      ...baseProfile().organization!,
      partnerType: props.partnerType,
    },
    user: {
      ...baseProfile().user,
      partnerType: props.partnerType,
      partnerActivities: [props.partnerType],
    },
  };
  const draft: ProfileDraft = { ...profileDraftFromProfile(profile), catalogTouched: {} };
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [storeCategories, setStoreCategories] = useState<string[]>(["doors"]);

  return (
    <OrganizationCatalogWizard
      profile={profile}
      draft={{ ...draft, storeCategories, navigatorStageIds: stageIds }}
      partnerType={props.partnerType}
      needsBranchFields={false}
      catalogEditable
      catalogTouched={{}}
      onCatalogTouchedChange={() => {}}
      onProfileUpdated={() => {}}
      organizationName="Магазин"
      onOrganizationNameChange={() => {}}
      catalogCity="Краснодар"
      onCatalogCityChange={() => {}}
      branchAddress=""
      onBranchAddressChange={() => {}}
      catalogImageUrl=""
      onCatalogImageUrlChange={() => {}}
      description=""
      onDescriptionChange={() => {}}
      specializations={[]}
      onSpecializationsChange={() => {}}
      storeCategories={storeCategories}
      onStoreCategoriesChange={setStoreCategories}
      website=""
      onWebsiteChange={() => {}}
      telegram=""
      onTelegramChange={() => {}}
      publicEmail=""
      onPublicEmailChange={() => {}}
      publicPhone=""
      onPublicPhoneChange={() => {}}
      workingProductIds={[]}
      workingServiceIds={[]}
      workingStageIds={[]}
      catalogStageIds={stageIds}
      onCatalogStageIdsChange={setStageIds}
      onPullWorkingDirections={() => {}}
    />
  );
}

describe("OrganizationCatalogWizard business catalog stages", () => {
  it("shows stage checkbox and advances step 2 when product and stage selected", async () => {
    const ui = userEvent.setup();
    render(<WizardHarness partnerType="STORE" />);

    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: /Инженерия/i })).toBeInTheDocument(),
    );
    await ui.click(screen.getByRole("checkbox", { name: /Инженерия/i }));
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByText("Публичные контакты")).toBeInTheDocument();
  });
});
