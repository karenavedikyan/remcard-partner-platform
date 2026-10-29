import { describe, expect, it } from "vitest";
import { buildPartnerShareText, resolvePublicPartnerType } from "./partner-filters";
import type { Partnership } from "@/lib/types";

function samplePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p1",
    status: "ACTIVE",
    initiatedBy: "me",
    note: "secret note",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    storeUserId: "me",
    proUserId: "other",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 99,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "me",
      displayName: "Me",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: null,
    },
    proUser: {
      id: "other",
      displayName: "Official Shop",
      organizationName: "Official Shop LLC",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
    },
    listPreference: { personalAlias: "My secret alias", archivedAt: null },
    ...overrides,
  };
}

describe("resolvePublicPartnerType", () => {
  it("matches list filter for inverted partnership sides (agent vs company)", () => {
    const seda = {
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
      displayName: "Seda",
      city: "Krasnodar",
      specializations: [],
      storeCategories: [],
    };
    const optovik = {
      partnerType: "COMPANY",
      partnerActivities: ["STORE", "AGENT"],
      organizationName: "ОПТОВИК",
      displayName: "ОПТОВИК",
      city: "Krasnodar",
      specializations: [],
      storeCategories: [],
    };
    expect(resolvePublicPartnerType(seda)).toBe("agent");
    expect(resolvePublicPartnerType(optovik)).toBe("company");
  });
});

describe("buildPartnerShareText", () => {
  it("excludes contract percents, notes, and personal alias", () => {
    const text = buildPartnerShareText(samplePartnership(), "me");
    expect(text).toContain("Official Shop LLC");
    expect(text).toContain("Краснодар");
    expect(text).not.toContain("99");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("alias");
    expect(text).not.toContain("Двери");
  });
});

describe("resolvePublicPartnerType canonical", () => {
  it("does not treat COMPANY+[STORE,AGENT] as agent", () => {
    expect(
      resolvePublicPartnerType({
        id: "u1",
        displayName: "Опт",
        city: null,
        specializations: [],
        storeCategories: [],
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
      }),
    ).toBe("company");
  });

  it("maps COMPANY+[STORE] to store and pure AGENT to agent", () => {
    expect(
      resolvePublicPartnerType({
        id: "u2",
        displayName: "Shop",
        city: null,
        specializations: [],
        storeCategories: [],
        partnerType: "COMPANY",
        partnerActivities: ["STORE"],
      }),
    ).toBe("store");
    expect(
      resolvePublicPartnerType({
        id: "u3",
        displayName: "Agent",
        city: null,
        specializations: [],
        storeCategories: [],
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("agent");
  });
});
