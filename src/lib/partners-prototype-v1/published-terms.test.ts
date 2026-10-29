import { describe, expect, it } from "vitest";
import { planPublishedInviteTerms } from "./published-terms";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

function profile(overrides: Partial<ProProfileResponse["user"]> = {}): ProProfileResponse {
  return {
    user: {
      id: "me",
      publicId: "P1",
      displayName: "Я",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "MASTER",
      partnerActivities: ["SERVICE"],
      description: null,
      catalogStatus: "APPROVED",
      isPublic: true,
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
      ...overrides,
    },
    organization: null,
    programs: [],
  };
}

function target(overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult {
  return {
    id: "t1",
    displayName: "Дом материалов",
    city: "Краснодар",
    photoUrl: null,
    description: null,
    specializations: [],
    badges: [],
    storeCategories: ["doors", "paint"],
    partnerType: "STORE",
    branches: [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
    ...overrides,
  };
}

describe("planPublishedInviteTerms", () => {
  it("marks requestTerms when published percents absent (no invented rates)", () => {
    const plan = planPublishedInviteTerms(profile(), target());
    expect(plan.requestTerms).toBe(true);
    expect(plan.mutualDefault).toBe(true);
    expect(plan.agentOneWay).toBe(false);
    expect(plan.categories.every((c) => c.storePercent == null)).toBe(true);
  });

  it("uses publishedTerms percents when present on search DTO", () => {
    const withTerms = {
      ...target(),
      publishedTerms: [
        { category: "doors", storePercent: 12, isExcluded: false },
        { category: "paint", storePercent: 8, isExcluded: false },
      ],
    } as PartnerSearchResult;
    const plan = planPublishedInviteTerms(profile(), withTerms);
    expect(plan.requestTerms).toBe(false);
    expect(plan.categories.find((c) => c.category === "doors")?.storePercent).toBe(12);
  });

  it("agent inviter is one-way (no mutual promise)", () => {
    const plan = planPublishedInviteTerms(
      profile({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }),
      target(),
    );
    expect(plan.agentOneWay).toBe(true);
    expect(plan.mutualDefault).toBe(false);
  });
});
