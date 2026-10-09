import { describe, expect, it } from "vitest";
import { buildCatalogPreviewModel } from "./catalog-public-preview";
import type { ProfileDraft } from "./profile-save";
import type { ProProfileResponse } from "./types";

const draft: ProfileDraft = {
  displayName: "Иван",
  catalogPublicName: "Иван Мастер",
  showFullName: true,
  catalogImageUrl: "",
  city: "Краснодар",
  description: "Desc",
  partnerType: "MASTER",
  specializations: ["tiles"],
  storeCategories: [],
  organizationName: "",
  branchAddress: "",
  website: "",
  telegram: "",
  publicEmail: "",
  publicPhone: "",
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
};

const profile: ProProfileResponse = {
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Краснодар",
    specializations: ["tiles"],
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
    showFullName: true,
  },
  organization: null,
  programs: [],
};

describe("buildCatalogPreviewModel", () => {
  it("uses public name when showFullName enabled", () => {
    const model = buildCatalogPreviewModel(profile, draft);
    expect(model.publicName).toBe("Иван Мастер");
    expect(model.serviceLabels.length).toBeGreaterThan(0);
  });
});
