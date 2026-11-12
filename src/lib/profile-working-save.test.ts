import { describe, expect, it } from "vitest";
import { profileDraftFromProfile } from "./profile-draft-sync";
import { validateWorkingProfileDraft } from "./profile-working-save";
import type { ProfileDraft } from "./profile-save";
import type { ProProfileResponse, WorkingProfileDto } from "./types";

const base: ProfileDraft = {
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
  catalogPublicName: "Иван",
  showFullName: false,
  catalogImageUrl: "",
  productCategoryIds: ["doors"],
  serviceSpecializationIds: [],
  navigatorStageIds: [],
  primaryDirection: null,
  partnerSearchOptIn: false,
  partnerWorkMode: "",
  areas: [],
  partnershipContactName: "",
  partnershipContactPhone: "",
  partnershipContactEmail: "",
};

describe("validateWorkingProfileDraft", () => {
  it("allows products-only without partner type specialization requirement", () => {
    expect(validateWorkingProfileDraft(base)).toBeNull();
  });

  it("requires direction when search opt-in enabled", () => {
    const err = validateWorkingProfileDraft({
      ...base,
      productCategoryIds: [],
      partnerSearchOptIn: true,
    });
    expect(err).toMatch(/видимости/);
  });

  it("keeps product and service doors distinct in primary validation", () => {
    const err = validateWorkingProfileDraft({
      ...base,
      serviceSpecializationIds: ["doors"],
      primaryDirection: { kind: "service", id: "doors" },
    });
    expect(err).toBeNull();
  });
});

function businessFixture(
  partnerType: "STORE" | "COMPANY",
  working: Partial<WorkingProfileDto> = {},
): ProProfileResponse {
  return {
    organization: {
      id: "org-wizard",
      name: "Орг",
      catalogStatus: "DRAFT",
      partnerType,
      branchCount: 0,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      workingDirectionsTouched: false,
      partnerSearchVisible: true,
      partnerSearchOptIn: true,
      partnerSearchOptInExplicit: true,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
      ...working,
    },
    user: {
      id: "u-wiz",
      publicId: "RC-WIZ",
      displayName: "Пётр",
      city: "Краснодар",
      role: "PRO",
      partnerType,
      partnerActivities: [partnerType],
      catalogStatus: "DRAFT",
      isPublic: false,
      specializations: [],
      description: null,
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

describe("validateWorkingProfileDraft validationIntent", () => {
  it.each(["STORE", "COMPANY"] as const)(
    "cabinet intent allows explicit ON without directions for %s",
    (partnerType) => {
      const profile = businessFixture(partnerType);
      const draft = profileDraftFromProfile(profile);
      expect(draft.partnerSearchOptIn).toBe(true);
      expect(
        validateWorkingProfileDraft(draft, {
          profile,
          partnerSearchTouched: false,
          validationIntent: "cabinet",
        }),
      ).toBeNull();
    },
  );

  it.each(["STORE", "COMPANY"] as const)(
    "activation allows untouched legacy explicit ON without directions for %s",
    (partnerType) => {
      const profile = businessFixture(partnerType);
      const draft = profileDraftFromProfile(profile);
      expect(
        validateWorkingProfileDraft(draft, {
          profile,
          partnerSearchTouched: false,
          validationIntent: "activation",
          validationScope: "full",
        }),
      ).toBeNull();
    },
  );

  it("activation blocks touched explicit ON without directions", () => {
    const profile = businessFixture("STORE");
    const draft = profileDraftFromProfile(profile);
    expect(
      validateWorkingProfileDraft(draft, {
        profile,
        partnerSearchTouched: true,
        validationIntent: "activation",
        validationScope: "full",
      }),
    ).toMatch(/видимости/);
  });

  it("activation blocks removing last direction while search stays ON", () => {
    const profile = businessFixture("STORE", {
      productCategoryIds: ["doors"],
      effectiveProductCategoryIds: ["doors"],
    });
    const draft = { ...profileDraftFromProfile(profile), productCategoryIds: [] };
    expect(
      validateWorkingProfileDraft(draft, {
        profile,
        partnerSearchTouched: false,
        validationIntent: "activation",
        validationScope: "full",
      }),
    ).toMatch(/видимости/);
  });

  it("contextless default validation stays strict for explicit ON without directions", () => {
    const profile = businessFixture("STORE");
    const draft = profileDraftFromProfile(profile);
    expect(validateWorkingProfileDraft(draft)).toMatch(/видимости/);
  });

  it("AUTO profile skips search-direction rule for AUTO and OFF", () => {
    const auto = businessFixture("STORE", {
      partnerSearchOptInExplicit: false,
      partnerSearchOptIn: false,
      partnerSearchVisible: true,
    });
    const autoDraft = profileDraftFromProfile(auto);
    const autoCtx = { profile: auto, partnerSearchTouched: false as const };
    expect(
      validateWorkingProfileDraft(autoDraft, { ...autoCtx, validationIntent: "activation" }),
    ).toBeNull();

    const off = businessFixture("STORE", {
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: true,
      partnerSearchVisible: false,
    });
    expect(
      validateWorkingProfileDraft(profileDraftFromProfile(off), {
        profile: off,
        validationIntent: "activation",
        partnerSearchTouched: false,
      }),
    ).toBeNull();
  });

  it("still requires basics on cabinet intent", () => {
    const profile = businessFixture("STORE");
    const draft: ProfileDraft = { ...profileDraftFromProfile(profile), city: "  " };
    expect(
      validateWorkingProfileDraft(draft, {
        profile,
        validationIntent: "cabinet",
        validationScope: "basics",
      }),
    ).toMatch(/город/);
  });

  it("basics scope ignores legacy phone without partnership contact name", () => {
    const profile = businessFixture("STORE", {
      partnershipContactPhone: "+79001112233",
      partnershipContactName: null,
    });
    const draft = profileDraftFromProfile(profile);
    expect(
      validateWorkingProfileDraft(draft, {
        profile,
        validationIntent: "cabinet",
        validationScope: "basics",
      }),
    ).toBeNull();
    expect(
      validateWorkingProfileDraft(draft, {
        profile,
        validationIntent: "cabinet",
        validationScope: "contacts",
      }),
    ).toMatch(/контактное лицо/);
  });
});
