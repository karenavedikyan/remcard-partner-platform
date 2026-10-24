/**
 * @vitest-environment jsdom
 */
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationCatalogWizard } from "./business/OrganizationCatalogWizard";
import { SpecialistCatalogWizard } from "./specialist/SpecialistCatalogWizard";
import { ProfileCatalogSection } from "./ProfileCatalogSection";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import * as profileSave from "@/lib/profile-save";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "tiles", label: "Плитка" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./business/OrganizationCatalogPublicBranchSelector", () => ({
  OrganizationCatalogPublicBranchSelector: () => null,
}));

vi.mock("@/lib/profile-catalog-completeness", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/profile-catalog-completeness")>();
  return { ...orig, catalogMissingForSubmit: vi.fn(() => []) };
});

vi.mock("@/lib/specialist-r06/catalog-completeness", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/specialist-r06/catalog-completeness")>();
  return { ...orig, specialistCatalogMissingForSubmit: vi.fn(() => []) };
});

function orgProfile(): ProProfileResponse {
  return {
    organization: {
      id: "o1",
      name: "Магазин",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 1,
      publicCatalogBranchId: "b1",
      storeCategories: ["doors"],
      specializations: [],
    },
    catalogPublication: { catalogEntity: "organization", isLivePublic: false, draftPending: false },
    programs: [],
    user: {
      id: "u1",
      role: "PRO",
      partnerType: "STORE",
      displayName: "Rep",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC1",
      specializations: [],
      storeCategories: ["doors"],
    },
  } as ProProfileResponse;
}

function soloProfile(): ProProfileResponse {
  return {
    programs: [],
    catalogPublication: { catalogEntity: "user", isLivePublic: false, draftPending: false },
    user: {
      id: "u-solo",
      role: "PRO",
      partnerType: "MASTER",
      displayName: "Master",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC-SOLO",
      specializations: ["tiles"],
      storeCategories: [],
    },
  } as ProProfileResponse;
}

async function goToPreview(ui: ReturnType<typeof userEvent.setup>) {
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await ui.click(screen.getByRole("button", { name: "Предпросмотр" }));
}

describe("catalog submit flow — accepted submit without duplicate POST", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("OrganizationCatalogWizard (STORE): refresh fail locks submit and skips second POST", async () => {
    const submitSpy = vi.spyOn(profileSave, "submitProfileForModerationReview").mockResolvedValue({
      submitAccepted: true,
      profile: null,
      refreshFailed: true,
    });
    vi.spyOn(profileSave, "refreshProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(profileSave, "persistCatalogDraftOnly").mockImplementation(async (p) => p);

    const onUpdated = vi.fn();
    const profile = orgProfile();
    const draft: ProfileDraft = { ...profileDraftFromProfile(profile), navigatorStageIds: ["L1-7"] };

    render(
      <OrganizationCatalogWizard
        profile={profile}
        draft={draft}
        partnerType="STORE"
        needsBranchFields={false}
        catalogEditable
        catalogTouched={{}}
        onCatalogTouchedChange={() => {}}
        onProfileUpdated={onUpdated}
        organizationName="Магазин"
        onOrganizationNameChange={() => {}}
        catalogCity="Краснодар"
        onCatalogCityChange={() => {}}
        branchAddress=""
        onBranchAddressChange={() => {}}
        catalogImageUrl="https://cdn/x.png"
        onCatalogImageUrlChange={() => {}}
        description="Длинное описание магазина для каталога"
        onDescriptionChange={() => {}}
        specializations={[]}
        onSpecializationsChange={() => {}}
        storeCategories={["doors"]}
        onStoreCategoriesChange={() => {}}
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
        catalogStageIds={["L1-7"]}
        onCatalogStageIdsChange={() => {}}
        onPullWorkingDirections={() => {}}
      />,
    );

    const ui = userEvent.setup();
    await goToPreview(ui);
    const submitBtn = screen.getByTestId("catalog-submit-publication");
    await ui.click(submitBtn);
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(onUpdated).toHaveBeenCalled();
    expect(onUpdated.mock.calls[0]?.[0]?.organization?.catalogStatus).toBe("PENDING");

    expect(screen.queryByTestId("catalog-submit-publication")).toBeNull();
    await ui.click(screen.getByTestId("catalog-recover-submit-status"));
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it("SpecialistCatalogWizard: pre-accept failure allows retry", async () => {
    const submitSpy = vi
      .spyOn(profileSave, "submitProfileForModerationReview")
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({
        submitAccepted: true,
        profile: { ...soloProfile(), user: { ...soloProfile().user, catalogStatus: "PENDING" } },
      });
    vi.spyOn(profileSave, "persistCatalogDraftOnly").mockImplementation(async (p) => p);

    const profile = soloProfile();
    const draft: ProfileDraft = {
      ...profileDraftFromProfile(profile),
      navigatorStageIds: ["L1-7"],
      specializations: ["tiles"],
    };

    render(
      <SpecialistCatalogWizard
        profile={profile}
        draft={draft}
        catalogEditable
        catalogTouched={{}}
        onCatalogTouchedChange={() => {}}
        onProfileUpdated={() => {}}
        catalogPublicName="Master"
        onCatalogPublicNameChange={() => {}}
        catalogCity="Краснодар"
        onCatalogCityChange={() => {}}
        showFullName={false}
        onShowFullNameChange={() => {}}
        catalogImageUrl="https://cdn/x.png"
        onCatalogImageUrlChange={() => {}}
        description="Описание специалиста для каталога достаточной длины"
        onDescriptionChange={() => {}}
        specializations={["tiles"]}
        onSpecializationsChange={() => {}}
        catalogStageIds={["L1-7"]}
        onCatalogStageIdsChange={() => {}}
        website=""
        onWebsiteChange={() => {}}
        telegram=""
        onTelegramChange={() => {}}
        publicEmail=""
        onPublicEmailChange={() => {}}
        publicPhone=""
        onPublicPhoneChange={() => {}}
        onPullWorkingDirections={() => {}}
        workingServiceIds={[]}
        workingStageIds={[]}
      />,
    );

    const ui = userEvent.setup();
    await goToPreview(ui);
    await ui.click(screen.getByTestId("catalog-submit-publication"));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    await ui.click(screen.getByTestId("catalog-submit-publication"));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(2));
  });

  it("ProfileCatalogSection uses same no-double-submit guard", async () => {
    const submitSpy = vi.spyOn(profileSave, "submitProfileForModerationReview").mockResolvedValue({
      submitAccepted: true,
      profile: null,
      refreshFailed: true,
    });
    vi.spyOn(profileSave, "refreshProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(profileSave, "persistCatalogDraftOnly").mockImplementation(async (p) => p);

    const profile = orgProfile();
    render(
      <ProfileCatalogSection
        profile={profile}
        draft={profileDraftFromProfile(profile)}
        catalogEditable
        partnerType="STORE"
        needsBranchFields={false}
        onProfileUpdated={() => {}}
        catalogPublicName="Магазин"
        onCatalogPublicNameChange={() => {}}
        onOrganizationNameChange={() => {}}
        showFullName={false}
        onShowFullNameChange={() => {}}
        catalogImageUrl="https://cdn/x.png"
        onCatalogImageUrlChange={() => {}}
        description="desc"
        onDescriptionChange={() => {}}
        specializations={[]}
        onSpecializationsChange={() => {}}
        storeCategories={["doors"]}
        onStoreCategoriesChange={() => {}}
        branchAddress=""
        onBranchAddressChange={() => {}}
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
        onCopyWorkingDirections={() => {}}
      />,
    );

    const ui = userEvent.setup();
    await ui.click(screen.getByRole("button", { name: "Подготовить профиль к публикации" }));
    await ui.click(screen.getByTestId("catalog-submit-publication"));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("catalog-submit-publication")).toBeNull();
  });
});
