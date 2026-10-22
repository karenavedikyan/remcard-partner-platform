import { describe, expect, it } from "vitest";
import { catalogTouchedFromProfile } from "@/lib/profile-catalog-touched";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import { mergeCatalogPrefill, workingProfileCatalogSeed } from "@/lib/specialist-r06/catalog-prefill";
import type { ProProfileResponse } from "@/lib/types";

function approvedCompanyCatalogProfile(
  catalogDraft: Record<string, unknown> | null,
): ProProfileResponse {
  return {
    organization: {
      id: "org-co",
      name: "Компания",
      catalogStatus: "APPROVED",
      catalogPublished: true,
      partnerType: "COMPANY",
      branchCount: 1,
      storeCategories: [],
      specializations: ["plumbing"],
      publicPhone: null,
      catalogDraft,
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: true,
      draftPending: Boolean(catalogDraft && Object.keys(catalogDraft).length > 0),
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
      partnershipContactPhone: "+79991234567",
      partnershipContactEmail: "partner@example.com",
    },
    user: {
      id: "u-co",
      publicId: "RC-CO",
      displayName: "Директор",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
      partnerActivities: ["COMPANY"],
      description: null,
      catalogStatus: "APPROVED",
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

describe("published org catalog with subsequent draft objects", () => {
  it.each([
    ["empty draft object", {}],
    ["website-only draft", { website: "https://changed.example.test" }],
    ["partial catalogTouched", { catalogTouched: { description: true } }],
  ])("does not restore working products or partnership phone (%s)", (_label, catalogDraft) => {
    const profile = approvedCompanyCatalogProfile(catalogDraft);
    const merged = mergeCatalogPrefill(
      profileDraftFromProfile(profile),
      workingProfileCatalogSeed(profile),
      catalogTouchedFromProfile(profile),
    );
    expect(merged.storeCategories).toEqual([]);
    expect(merged.publicPhone).toBe("");
    expect(merged.specializations).toEqual(["plumbing"]);
  });

  it("partial touched adds flags without dropping published locks on other fields", () => {
    const profile = approvedCompanyCatalogProfile({ catalogTouched: { description: true } });
    expect(catalogTouchedFromProfile(profile)).toMatchObject({
      storeCategories: true,
      publicPhone: true,
      description: true,
    });
  });

  it("keeps in-form website while still blocking product prefill", () => {
    const profile = approvedCompanyCatalogProfile({ website: "https://changed.example.test" });
    const current = {
      ...profileDraftFromProfile(profile),
      website: "https://changed.example.test",
    };
    const merged = mergeCatalogPrefill(
      current,
      workingProfileCatalogSeed(profile),
      catalogTouchedFromProfile(profile),
    );
    expect(merged.website).toBe("https://changed.example.test");
    expect(merged.storeCategories).toEqual([]);
  });

  it("still pre-fills unpublished first catalog open", () => {
    const profile = approvedCompanyCatalogProfile(null);
    profile.organization!.catalogPublished = false;
    profile.organization!.catalogStatus = "DRAFT";
    profile.catalogPublication!.isLivePublic = false;

    const merged = mergeCatalogPrefill(
      profileDraftFromProfile(profile),
      workingProfileCatalogSeed(profile),
      catalogTouchedFromProfile(profile),
    );
    expect(merged.storeCategories).toEqual(["doors"]);
  });
});
