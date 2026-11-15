import { describe, expect, it } from "vitest";
import {
  partnershipAllowedTermCategories,
  resolvePartnershipTermsCategoryUser,
} from "./partnership-terms-category-source";

const baseUser = {
  role: "PRO" as const,
  isBlocked: false,
  partnerType: "STORE" as const,
  partnerActivities: ["STORE"] as string[],
  storeCategories: ["doors", "floor"],
  specializations: [] as string[],
};

describe("partnership terms category source", () => {
  it("uses store user categories for ordinary store/pro pair", () => {
    const store = { ...baseUser, id: "s1", partnerType: "STORE" as const };
    const pro = {
      ...baseUser,
      id: "p1",
      partnerType: "MASTER" as const,
      partnerActivities: ["SERVICE"],
      storeCategories: [],
      specializations: ["install"],
    };
    expect(resolvePartnershipTermsCategoryUser(store, pro)).toBe(store);
    expect(partnershipAllowedTermCategories(store, pro)).toEqual(new Set(["doors", "floor"]));
  });

  it("uses business side for inverted agent store row", () => {
    const agentStore = {
      ...baseUser,
      partnerType: "STORE" as const,
      partnerActivities: ["AGENT"],
      storeCategories: ["legacy-agent"],
    };
    const businessPro = {
      ...baseUser,
      partnerType: "MASTER" as const,
      partnerActivities: ["SERVICE"],
      storeCategories: [],
      specializations: ["hvac"],
    };
    expect(resolvePartnershipTermsCategoryUser(agentStore, businessPro)).toBe(businessPro);
    expect(partnershipAllowedTermCategories(agentStore, businessPro)).toEqual(new Set(["hvac"]));
  });

  it("does not union both sides", () => {
    const store = { ...baseUser, storeCategories: ["a"] };
    const pro = {
      ...baseUser,
      partnerType: "MASTER" as const,
      partnerActivities: ["SERVICE"],
      storeCategories: [],
      specializations: ["b"],
    };
    const allowed = partnershipAllowedTermCategories(store, pro);
    expect(allowed.size).toBe(1);
    expect(allowed.has("a")).toBe(true);
    expect(allowed.has("b")).toBe(false);
  });
});