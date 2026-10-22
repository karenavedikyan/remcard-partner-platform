import { describe, expect, it } from "vitest";
import { catalogTouchedFromProfile } from "@/lib/profile-catalog-touched";
import type { ProProfileResponse } from "@/lib/types";

function orgProfile(catalogDraft: unknown): ProProfileResponse {
  return {
    organization: {
      id: "org-1",
      name: "Shop",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 1,
      storeCategories: ["doors"],
      catalogDraft,
    },
    catalogPublication: { catalogEntity: "organization", isLivePublic: false },
    programs: [],
    workingProfile: null,
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Owner",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
      partnerActivities: ["COMPANY"],
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
}

describe("catalogTouchedFromProfile", () => {
  it("reads storeCategories touched from organization.catalogDraft", () => {
    const profile = orgProfile({ catalogTouched: { storeCategories: true } });
    expect(catalogTouchedFromProfile(profile)).toEqual({ storeCategories: true });
  });

  it("falls back to user.catalogDraft for solo MASTER", () => {
    const profile: ProProfileResponse = {
      ...orgProfile(null),
      organization: null,
      catalogPublication: { catalogEntity: "user", isLivePublic: false },
      user: {
        ...orgProfile(null).user,
        partnerType: "MASTER",
        catalogDraft: { catalogTouched: { navigatorStageIds: true } },
      },
    };
    expect(catalogTouchedFromProfile(profile)).toEqual({ navigatorStageIds: true });
  });
});
