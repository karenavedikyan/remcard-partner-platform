import { describe, expect, it } from "vitest";
import type { ProfileDraft } from "@/lib/profile-save";
import {
  businessProfileShowEmptyIntro,
  businessWorkingProfileHasMeaningfulSavedProgress,
} from "./business-profile-empty-intro";

function emptyDraft(overrides: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    displayName: "",
    catalogCity: "",
    city: "",
    description: "",
    partnerType: "COMPANY",
    specializations: [],
    storeCategories: [],
    organizationName: "",
    branchAddress: "",
    website: "",
    telegram: "",
    publicEmail: "",
    publicPhone: "",
    catalogPublicName: "",
    showFullName: false,
    catalogImageUrl: "",
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: [],
    primaryDirection: null,
    partnerSearchOptIn: false,
    partnerWorkMode: "",
    areas: [],
    partnershipContactName: "",
    partnershipContactPhone: "",
    partnershipContactEmail: "",
    partnerActivities: [],
    ...overrides,
  };
}

describe("businessProfileShowEmptyIntro", () => {
  it("shows intro for brand-new saved snapshot", () => {
    expect(businessProfileShowEmptyIntro(emptyDraft(), {})).toBe(true);
  });

  it("skips intro when one required field is missing but other progress exists", () => {
    const partial = emptyDraft({
      organizationName: "Юг",
      displayName: "Иван",
      city: "",
    });
    expect(businessWorkingProfileHasMeaningfulSavedProgress(partial)).toBe(true);
    expect(businessProfileShowEmptyIntro(partial, {})).toBe(false);
  });

  it("skips intro for cabinet-ready completed profile", () => {
    const done = emptyDraft({
      organizationName: "Юг",
      displayName: "Иван",
      city: "Краснодар",
      partnerType: "COMPANY",
    });
    expect(businessProfileShowEmptyIntro(done, {})).toBe(false);
  });

  it("skips intro when forceEditing is set", () => {
    expect(businessProfileShowEmptyIntro(emptyDraft(), { forceEditing: true })).toBe(false);
  });

  it("detects directions, areas, and contacts as meaningful progress", () => {
    expect(
      businessWorkingProfileHasMeaningfulSavedProgress(
        emptyDraft({ productCategoryIds: ["doors"] }),
      ),
    ).toBe(true);
    expect(
      businessWorkingProfileHasMeaningfulSavedProgress(emptyDraft({ areas: ["Krasnodar"] })),
    ).toBe(true);
    expect(
      businessWorkingProfileHasMeaningfulSavedProgress(
        emptyDraft({ partnershipContactPhone: "+79991234567" }),
      ),
    ).toBe(true);
  });
});
