import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSubmitProfileForModeration,
  catalogPublicationEditable,
  effectiveCatalogStatus,
  profileBasicsEditable,
  profileFieldsEditable,
} from "./profile-catalog-state.ts";
import type { ProProfileResponse } from "./types.ts";

function profile(partial: Partial<ProProfileResponse>): ProProfileResponse {
  return {
    organization: null,
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "A",
      city: "X",
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
    ...partial,
  };
}

describe("profile-catalog-state", () => {
  it("uses organization catalog status when org exists", () => {
    const p = profile({
      user: { ...profile({}).user, catalogStatus: "DRAFT" },
      organization: {
        id: "o1",
        name: "Shop",
        catalogStatus: "PENDING",
        partnerType: "STORE",
        branchCount: 1,
      },
    });
    assert.equal(effectiveCatalogStatus(p), "PENDING");
    assert.equal(profileBasicsEditable(p), true);
    assert.equal(catalogPublicationEditable(p), false);
    assert.equal(profileFieldsEditable(p), false);
    assert.equal(canSubmitProfileForModeration(p), false);
  });

  it("allows submit for solo user in NEEDS_REVISION", () => {
    const p = profile({
      user: { ...profile({}).user, catalogStatus: "NEEDS_REVISION" },
    });
    assert.equal(canSubmitProfileForModeration(p), true);
    assert.equal(profileFieldsEditable(p), true);
  });
});
