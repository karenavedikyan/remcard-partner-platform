import { describe, expect, it } from "vitest";
import {
  isWorkingProfileDirty,
  partnerSearchCheckboxValue,
  profileDraftFromProfile,
  profileDraftsEqual,
} from "./profile-draft-sync";
import type { ProProfileResponse } from "@/lib/types";

const baseProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Москва",
    specializations: ["L1-0"],
    role: "PRO",
    partnerType: "MASTER",
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

describe("profile-draft-sync", () => {
  it("uses legacy partnerSearchVisible when opt-in was not explicit", () => {
    expect(
      partnerSearchCheckboxValue({
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: [],
        effectiveServiceSpecializationIds: [],
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
      }),
    ).toBe(true);
  });

  it("detects dirty display name", () => {
    const saved = profileDraftFromProfile(baseProfile);
    const dirty = { ...saved, displayName: "Несохраненное имя" };
    expect(isWorkingProfileDirty(saved, dirty)).toBe(true);
  });

  it("treats equal drafts as clean", () => {
    const saved = profileDraftFromProfile(baseProfile);
    expect(profileDraftsEqual(saved, { ...saved })).toBe(true);
  });

  it("uses organization catalog directions, not owner user arrays", () => {
    const profile: ProProfileResponse = {
      ...baseProfile,
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: false,
        draftPending: false,
        published: {
          description: null,
          specializations: [],
          storeCategories: [],
          website: null,
          telegram: null,
          publicEmail: null,
          publicPhone: null,
        },
      },
      user: {
        ...baseProfile.user,
        partnerType: "STORE",
        specializations: ["electrician"],
        storeCategories: ["plumbing"],
        description: "Owner personal",
        telegram: "https://t.me/owner",
      },
      organization: {
        id: "org-1",
        name: "Shop",
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        branchCount: 1,
        description: "Org desc",
        website: "https://shop.ru",
        storeCategories: ["doors"],
        specializations: ["tiles"],
        telegram: "@shop",
        publicEmail: "shop@test.ru",
        publicPhone: "+79001112233",
      },
    };
    const draft = profileDraftFromProfile(profile);
    expect(draft.specializations).toEqual(["tiles"]);
    expect(draft.storeCategories).toEqual(["doors"]);
    expect(draft.description).toBe("Org desc");
    expect(draft.telegram).toBe("@shop");
    expect(draft.specializations).not.toContain("electrician");
  });

  it("legacy org owner initial editor draft matches saved snapshot (ОПТОВИК)", () => {
    const profile: ProProfileResponse = {
      organization: {
        id: "org-opt",
        name: "ОПТОВИК",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 6,
        description: null,
        website: null,
        storeCategories: ["doors", "flooring", "handles"],
        specializations: [],
        telegram: null,
        publicEmail: null,
        publicPhone: null,
      },
      programs: [],
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: true,
        draftPending: false,
        published: {
          description: null,
          specializations: [],
          storeCategories: ["doors", "flooring", "handles"],
          website: null,
          telegram: null,
          publicEmail: null,
          publicPhone: null,
        },
      },
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors", "flooring", "handles"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: [
          "L1-1",
          "L1-2",
          "L1-3",
          "L1-4",
          "L1-5",
          "L1-6",
          "L1-7",
          "L1-8",
          "L1-9",
        ],
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
        ...baseProfile.user,
        displayName: "Иван",
        city: "Москва",
        partnerType: "STORE",
        description: "legacy user desc",
        catalogStatus: "APPROVED",
        isPublic: true,
        specializations: [
          "L1-1",
          "L1-2",
          "L1-3",
          "L1-4",
          "L1-5",
          "L1-6",
          "L1-7",
          "L1-8",
          "L1-9",
        ],
        storeCategories: ["doors", "flooring", "handles"],
      },
    };
    const saved = profileDraftFromProfile(profile);
    const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
    const u = profile.user;
    const w = profile.workingProfile!;
    const form = profileDraftFromProfile(profile);
    const organizationName = form.organizationName;
    const areasText = (w.areas ?? u.areas ?? []).join("\n");
    const current = {
      ...form,
      displayName: u.displayName ?? "",
      city: u.city ?? "",
      partnerType: u.partnerType ?? "MASTER",
      catalogPublicName: catalogOnOrg ? organizationName : form.catalogPublicName,
      productCategoryIds: w.effectiveProductCategoryIds,
      serviceSpecializationIds: w.effectiveServiceSpecializationIds,
      navigatorStageIds: w.effectiveNavigatorStageIds ?? [],
      partnerSearchOptIn: partnerSearchCheckboxValue(w),
      partnerWorkMode: w.partnerWorkMode ?? "",
      areas: areasText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      partnershipContactName: w.partnershipContactName ?? "",
      partnershipContactPhone: w.partnershipContactPhone ?? "",
      partnershipContactEmail: w.partnershipContactEmail ?? "",
    };
    expect(profileDraftsEqual(saved, current)).toBe(true);
  });

  it("legacy store org without catalogPublication stays clean", () => {
    const profile: ProProfileResponse = {
      organization: {
        id: "org-opt",
        name: "ОПТОВИК",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 6,
        storeCategories: ["doors", "flooring", "handles"],
      },
      programs: [],
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors", "flooring", "handles"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9"],
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
        ...baseProfile.user,
        partnerType: "STORE",
        catalogStatus: "APPROVED",
        isPublic: true,
        specializations: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9"],
        storeCategories: ["doors", "flooring", "handles"],
        description: null,
      },
    };
    const saved = profileDraftFromProfile(profile);
    const w = profile.workingProfile!;
    const u = profile.user;
    const form = profileDraftFromProfile(profile);
    const current = {
      ...form,
      displayName: u.displayName ?? "",
      city: u.city ?? "",
      partnerType: u.partnerType ?? "MASTER",
      catalogPublicName: form.catalogPublicName,
      productCategoryIds: w.effectiveProductCategoryIds,
      serviceSpecializationIds: w.effectiveServiceSpecializationIds,
      navigatorStageIds: w.effectiveNavigatorStageIds ?? [],
      partnerSearchOptIn: partnerSearchCheckboxValue(w),
      partnerWorkMode: w.partnerWorkMode ?? "",
      areas: [],
      partnershipContactName: "",
      partnershipContactPhone: "",
      partnershipContactEmail: "",
    };
    expect(profileDraftsEqual(saved, current)).toBe(true);
  });

  it("keeps empty organization specialization list without owner fallback", () => {
    const profile: ProProfileResponse = {
      ...baseProfile,
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: false,
        draftPending: false,
        published: {
          description: null,
          specializations: [],
          storeCategories: [],
          website: null,
          telegram: null,
          publicEmail: null,
          publicPhone: null,
        },
      },
      user: {
        ...baseProfile.user,
        partnerType: "COMPANY",
        specializations: ["electrician"],
      },
      organization: {
        id: "org-2",
        name: "Co",
        catalogStatus: "DRAFT",
        partnerType: "COMPANY",
        branchCount: 0,
        specializations: [],
        storeCategories: ["doors"],
      },
    };
    const draft = profileDraftFromProfile(profile);
    expect(draft.specializations).toEqual([]);
    expect(draft.storeCategories).toEqual(["doors"]);
  });
});
