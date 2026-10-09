import { describe, expect, it } from "vitest";
import { catalogMissingForSubmit, catalogPublicationStatusKey } from "./profile-catalog-completeness";
import type { ProfileDraft } from "./profile-save";
import type { ProProfileResponse } from "./types";

const draftBase: ProfileDraft = {
  displayName: "Иван",
  catalogPublicName: "Иван",
  showFullName: true,
  catalogImageUrl: "",
  city: "Краснодар",
  description: "О нас",
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

const profileBase: ProProfileResponse = {
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Краснодар",
    specializations: [],
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
  organization: null,
  programs: [],
};

describe("catalogMissingForSubmit", () => {
  it("returns empty when solo master is complete", () => {
    expect(catalogMissingForSubmit(profileBase, draftBase)).toEqual([]);
  });

  it("flags missing services for master", () => {
    const missing = catalogMissingForSubmit(profileBase, { ...draftBase, specializations: [] });
    expect(missing.some((m) => m.id === "services")).toBe(true);
  });
});

describe("catalogPublicationStatusKey", () => {
  it("detects published with draft", () => {
    const profile: ProProfileResponse = {
      ...profileBase,
      user: { ...profileBase.user, catalogStatus: "APPROVED" },
      catalogPublication: {
        isLivePublic: true,
        draftPending: true,
        published: { description: null, specializations: [], storeCategories: [], website: null, telegram: null, publicEmail: null, publicPhone: null },
      },
    };
    expect(catalogPublicationStatusKey(profile)).toBe("published_with_draft");
  });
});
