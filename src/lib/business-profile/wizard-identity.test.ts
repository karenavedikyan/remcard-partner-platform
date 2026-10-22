import { describe, expect, it } from "vitest";
import { externalBusinessProfileIdentityShift } from "@/lib/business-profile/wizard-identity";
import type { ProProfileResponse } from "@/lib/types";

function profile(userId: string, orgId: string | null): ProProfileResponse {
  return {
    organization: orgId
      ? {
          id: orgId,
          name: "Org",
          catalogStatus: "DRAFT",
          partnerType: "COMPANY",
          branchCount: 0,
        }
      : null,
    programs: [],
    user: {
      id: userId,
      publicId: "RC",
      displayName: "Rep",
      city: "City",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
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

describe("externalBusinessProfileIdentityShift", () => {
  it("detects user switch", () => {
    expect(externalBusinessProfileIdentityShift(profile("u1", "o1"), profile("u2", "o1"))).toBe(
      true,
    );
  });

  it("detects org replacement when both ids existed", () => {
    expect(externalBusinessProfileIdentityShift(profile("u1", "o1"), profile("u1", "o2"))).toBe(
      true,
    );
  });

  it("does not treat first organization creation as external shift", () => {
    expect(externalBusinessProfileIdentityShift(profile("u1", null), profile("u1", "o-new"))).toBe(
      false,
    );
  });

  it("does not shift on same identity refresh", () => {
    expect(externalBusinessProfileIdentityShift(profile("u1", "o1"), profile("u1", "o1"))).toBe(
      false,
    );
  });
});
