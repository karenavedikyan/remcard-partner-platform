import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateProfileDraft } from "./profile-save.ts";
import type { ProProfileResponse } from "./types.ts";

const baseProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Москва",
    specializations: ["stage-1"],
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

describe("validateProfileDraft", () => {
  it("rejects invalid representative name", () => {
    const err = validateProfileDraft(
      {
        displayName: "Пользователь",
        city: "Москва",
        description: "",
        partnerType: "MASTER",
        specializations: ["stage-1"],
        storeCategories: [],
        organizationName: "",
        branchAddress: "",
        website: "",
        telegram: "",
        publicEmail: "",
        publicPhone: "",
        catalogPublicName: "Пользователь",
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
      },
      baseProfile,
    );
    assert.match(err ?? "", /имя представителя/i);
  });

  it("requires branch address for store without org", () => {
    const err = validateProfileDraft(
      {
        displayName: "Магазин",
        city: "Москва",
        description: "",
        partnerType: "STORE",
        specializations: [],
        storeCategories: ["doors"],
        organizationName: "Мой магазин",
        branchAddress: "",
        website: "",
        telegram: "",
        publicEmail: "",
        publicPhone: "",
        catalogPublicName: "Пользователь",
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
      },
      baseProfile,
    );
    assert.match(err ?? "", /филиала/i);
  });
});
