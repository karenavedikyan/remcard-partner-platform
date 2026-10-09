import { describe, expect, it } from "vitest";
import { buildWorkingProfilePatchBody } from "./working-profile-patch";
import type { ProProfileResponse } from "./types";

const profile: ProProfileResponse = {
  organization: null,
  programs: [],
  workingProfile: {
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: [],
    primaryDirection: null,
    effectiveProductCategoryIds: ["doors"],
    effectiveServiceSpecializationIds: ["tiles"],
    effectiveNavigatorStageIds: ["L1-7"],
    partnerSearchVisible: true,
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
    publicId: "RC1",
    displayName: "Иван",
    city: "Краснодар",
    specializations: ["tiles", "L1-7"],
    role: "PRO",
    partnerType: "MASTER",
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
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

describe("buildWorkingProfilePatchBody", () => {
  it("omits directions and visibility when only contact changes", () => {
    const body = buildWorkingProfilePatchBody(profile, {
      displayName: "Иван",
      city: "Краснодар",
      description: "",
      partnerType: "MASTER",
      specializations: [],
      storeCategories: [],
      organizationName: "",
      branchAddress: "",
      website: "",
      telegram: "",
      publicEmail: "",
      publicPhone: "",
      productCategoryIds: ["doors"],
      serviceSpecializationIds: ["tiles"],
      navigatorStageIds: ["L1-7"],
      primaryDirection: null,
      partnerSearchOptIn: true,
      partnerWorkMode: "",
      areas: [],
      partnershipContactName: "Мария",
      partnershipContactPhone: "",
      partnershipContactEmail: "",
    });
    expect(body.productCategoryIds).toBeUndefined();
    expect(body.partnerSearchOptIn).toBeUndefined();
    expect(body.partnershipContactName).toBe("Мария");
  });

  it("sends partnerSearchOptIn only when touched", () => {
    const body = buildWorkingProfilePatchBody(
      profile,
      {
        displayName: "Иван",
        city: "Краснодар",
        description: "",
        partnerType: "MASTER",
        specializations: [],
        storeCategories: [],
        organizationName: "",
        branchAddress: "",
        website: "",
        telegram: "",
        publicEmail: "",
        publicPhone: "",
        productCategoryIds: ["doors"],
        serviceSpecializationIds: ["tiles"],
        navigatorStageIds: ["L1-7"],
        primaryDirection: null,
        partnerSearchOptIn: false,
        partnerWorkMode: "",
        areas: [],
        partnershipContactName: "",
        partnershipContactPhone: "",
        partnershipContactEmail: "",
      },
      { partnerSearchTouched: true },
    );
    expect(body.partnerSearchOptIn).toBe(false);
  });
});
