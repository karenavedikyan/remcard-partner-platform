import { describe, expect, it } from "vitest";
import { validateWorkingProfileDraft } from "./profile-working-save";
import type { ProfileDraft } from "./profile-save";

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
