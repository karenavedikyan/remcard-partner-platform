import { describe, expect, it } from "vitest";
import type { ProProfileResponse } from "@/lib/types";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import {
  catalogPrefillSourceKey,
  mergeCatalogPrefill,
  workingProfileCatalogSeed,
} from "@/lib/specialist-r06/catalog-prefill";

function profile(overrides: Partial<ProProfileResponse> = {}): ProProfileResponse {
  const base: ProProfileResponse = {
    user: {
      id: "u1",
      publicId: "RC-1",
      displayName: "Working Spec Name",
      city: "Krasnodar",
      catalogDisplayName: "Working Spec Name",
      catalogCity: "Krasnodar",
      specializations: [],
      role: "PRO",
      partnerType: "MASTER",
      description: "Saved bio",
      catalogStatus: "DRAFT",
      isPublic: false,
      rejectionReason: null,
      badges: [],
      photoUrl: "https://cdn.example/photo.jpg",
      storeCategories: [],
      areas: [],
      website: "https://example.com",
      telegram: "@spec",
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
      catalogDraft: { navigatorStageIds: [], catalogTouched: { navigatorStageIds: true } },
    },
    organization: null,
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: ["design"],
      navigatorStageIds: ["L1-1"],
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: ["design"],
      effectiveNavigatorStageIds: ["L1-1"],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingDirectionsTouched: false,
      partnerWorkMode: "ON_SITE",
      areas: [],
      partnershipContactName: "Ivan",
      partnershipContactPhone: "+79001112233",
      partnershipContactEmail: "ivan@example.com",
    },
  };
  return { ...base, ...overrides, user: { ...base.user, ...overrides.user } };
}

describe("catalog prefill from saved profile", () => {
  it("maps prototype-aligned fields including contact fallbacks", () => {
    const seed = workingProfileCatalogSeed(profile());
    expect(seed.catalogPublicName).toBe("Working Spec Name");
    expect(seed.catalogCity).toBe("Krasnodar");
    expect(seed.specializations).toEqual(["design"]);
    expect(seed.navigatorStageIds).toEqual(["L1-1"]);
    expect(seed.description).toBe("Saved bio");
    expect(seed.catalogImageUrl).toBe("https://cdn.example/photo.jpg");
    expect(seed.publicPhone).toBe("+79001112233");
    expect(seed.publicEmail).toBe("ivan@example.com");
    expect(seed.website).toBe("https://example.com");
    expect(seed.telegram).toBe("@spec");
  });

  it("respects touched and existing catalog draft; keeps explicit empty stages", () => {
    const current = profileDraftFromProfile(profile());
    const emptyStages = { ...current, navigatorStageIds: [], catalogNavigatorStageIds: [] };
    const seed = workingProfileCatalogSeed(profile());
    const merged = mergeCatalogPrefill(emptyStages, seed, {
      navigatorStageIds: true,
      specializations: true,
    });
    expect(merged.navigatorStageIds).toEqual([]);
    expect(merged.specializations).toEqual(current.specializations);
  });

  it("source key changes when saved working profile changes (finish/edit-save refresh)", () => {
    const a = catalogPrefillSourceKey(profile());
    const b = catalogPrefillSourceKey(
      profile({
        user: { displayName: "Updated Name" },
        workingProfile: {
          ...profile().workingProfile!,
          serviceSpecializationIds: ["finishing"],
          effectiveServiceSpecializationIds: ["finishing"],
        },
      }),
    );
    expect(a).not.toBe(b);
  });

  it("prefills working display name when GET provenance is working_profile", () => {
    const seed = workingProfileCatalogSeed(
      profile({
        user: {
          displayName: "Актуальное рабочее имя",
          catalogDisplayName: "Старое регистрационное имя",
          catalogDisplayNameSource: "working_profile",
        },
      }),
    );
    expect(seed.catalogPublicName).toBe("Актуальное рабочее имя");
  });

  it("source key differs when only catalogDisplayName changes under live_public", () => {
    const a = catalogPrefillSourceKey(
      profile({
        user: {
          catalogDisplayName: "Карточка A",
          catalogDisplayNameSource: "live_public",
        },
      }),
    );
    const b = catalogPrefillSourceKey(
      profile({
        user: {
          catalogDisplayName: "Карточка B",
          catalogDisplayNameSource: "live_public",
        },
      }),
    );
    expect(a).not.toBe(b);
  });

  it("profileDraftFromProfile aligns catalog public name with GET provenance", () => {
    const draft = profileDraftFromProfile(
      profile({
        user: {
          displayName: "Актуальное рабочее имя",
          catalogDisplayName: "Старое регистрационное имя",
          catalogDisplayNameSource: "working_profile",
        },
      }),
    );
    expect(draft.catalogPublicName).toBe("Актуальное рабочее имя");
  });
});
