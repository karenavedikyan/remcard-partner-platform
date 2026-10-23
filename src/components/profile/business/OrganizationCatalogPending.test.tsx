/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OrganizationCatalogSection } from "./OrganizationCatalogSection";
import type { ProProfileResponse } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile-save";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";

function pendingStoreProfile(): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин дверей",
      catalogStatus: "PENDING",
      partnerType: "STORE",
      branchCount: 1,
      storeCategories: ["doors"],
      specializations: [],
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    programs: [],
    workingProfile: null,
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Rep",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
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
}

const baseDraft = (profile: ProProfileResponse): ProfileDraft => ({
  ...profileDraftFromProfile(profile),
  catalogTouched: {},
});

describe("OrganizationCatalogSection pending preview", () => {
  it("shows product labels in submitted card preview for STORE", async () => {
    const profile = pendingStoreProfile();
    const ui = userEvent.setup();
    render(
      <OrganizationCatalogSection
        profile={profile}
        draft={baseDraft(profile)}
        partnerType="STORE"
        needsBranchFields={false}
        catalogEditable={false}
        catalogTouched={{}}
        onCatalogTouchedChange={() => {}}
        onProfileUpdated={() => {}}
        organizationName="Магазин дверей"
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
        catalogStageIds={[]}
        onCatalogStageIdsChange={() => {}}
        onPullWorkingDirections={() => {}}
      />,
    );

    await ui.click(screen.getByText(/Посмотреть отправленную карточку/i));
    expect(screen.getByText(/Товары:/i)).toBeInTheDocument();
    expect(screen.queryByText(/data-catalog-preview-variant="specialist"/)).not.toBeInTheDocument();
  });
});
