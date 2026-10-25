import { describe, expect, it } from "vitest";
import { businessOwnerHomePartnerType, shouldRenderBusinessOwnerHome } from "./gate";

describe("business owner home gate", () => {
  it("enables prototype home for store and company PRO owners", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
    ).toBe(true);
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "COMPANY",
        partnerActivities: ["COMPANY"],
      }),
    ).toBe(true);
  });

  it("keeps legacy home for pure agent even when partnerType is STORE", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
      }),
    ).toBe(false);
  });

  it("keeps legacy home for non-pro and master", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "CLIENT",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
    ).toBe(false);
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "MASTER",
        partnerActivities: ["MASTER"],
      }),
    ).toBe(false);
  });

  it("maps partner type for dashboard config", () => {
    expect(businessOwnerHomePartnerType({ partnerType: "STORE" })).toBe("STORE");
    expect(businessOwnerHomePartnerType({ partnerType: "COMPANY" })).toBe("COMPANY");
    expect(businessOwnerHomePartnerType({ partnerType: "MASTER" })).toBeNull();
  });
});
