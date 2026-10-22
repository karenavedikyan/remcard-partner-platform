import { describe, expect, it } from "vitest";
import { businessProfileWizardEligible } from "./eligibility";
import type { ProProfileResponse } from "@/lib/types";

function profile(partial: Partial<ProProfileResponse["user"]>): ProProfileResponse {
  return {
    organization: null,
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Rep",
      city: "Krasnodar",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
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
      ...partial,
    },
  };
}

describe("businessProfileWizardEligible", () => {
  it("allows store and company PRO owners", () => {
    expect(businessProfileWizardEligible(profile({ partnerType: "STORE" }), null)).toBe(true);
    expect(businessProfileWizardEligible(profile({ partnerType: "COMPANY" }), null)).toBe(true);
  });

  it("blocks legacy pure agent on STORE partnerType", () => {
    expect(
      businessProfileWizardEligible(
        profile({ partnerType: "STORE", partnerActivities: ["AGENT"] }),
        null,
      ),
    ).toBe(false);
  });

  it("blocks organization staff without own partner activity", () => {
    expect(
      businessProfileWizardEligible(profile({ role: "CLIENT", partnerType: "STORE" }), {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "o1", name: "Org" },
        membershipKind: "BRANCH_STAFF",
      }),
    ).toBe(false);
  });

  it("blocks staff even when employer is STORE (no broad fallback)", () => {
    expect(
      businessProfileWizardEligible(
        profile({ role: "CLIENT", partnerType: "COMPANY", partnerActivities: [] }),
        {
          role: "ORG_TEAM_MEMBER",
          organization: { id: "o1", name: "Org" },
          membershipKind: "HEAD_OFFICE",
        },
      ),
    ).toBe(false);
  });

  it("does not enable wizard for MASTER", () => {
    expect(businessProfileWizardEligible(profile({ partnerType: "MASTER" }), null)).toBe(false);
  });
});
