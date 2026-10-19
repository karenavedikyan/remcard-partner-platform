import { describe, expect, it } from "vitest";
import {
  catalogNavigatorStageIdsFromUser,
  catalogTouchedFromUser,
} from "@/lib/profile-catalog-stages-hydration";
import type { ProProfileResponse } from "@/lib/types";

function userWithCatalogDraft(
  catalogDraft: unknown,
): ProProfileResponse["user"] {
  return {
    id: "u1",
    publicId: "RC-TEST",
    displayName: "Spec",
    city: "Krasnodar",
    specializations: ["design"],
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
    catalogDraft,
  } as ProProfileResponse["user"];
}

describe("catalog stage hydration after save GET", () => {
  it("returns empty when GET omits catalogDraft (pre-fix contract gap)", () => {
    const u = userWithCatalogDraft(undefined);
    expect(catalogNavigatorStageIdsFromUser(u)).toEqual([]);
  });

  it("round-trips selected stages from minimal catalogDraft DTO", () => {
    const u = userWithCatalogDraft({
      navigatorStageIds: ["L1-7"],
      catalogTouched: { navigatorStageIds: true },
    });
    expect(catalogNavigatorStageIdsFromUser(u)).toEqual(["L1-7"]);
    expect(catalogTouchedFromUser(u)).toEqual({ navigatorStageIds: true });
  });

  it("preserves explicit empty stage clear", () => {
    const u = userWithCatalogDraft({
      navigatorStageIds: [],
      catalogTouched: { navigatorStageIds: true },
    });
    expect(catalogNavigatorStageIdsFromUser(u)).toEqual([]);
  });
});
