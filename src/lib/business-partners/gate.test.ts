import { describe, expect, it } from "vitest";
import { resolveBusinessOwnerPartnersEligibility } from "./gate";

describe("resolveBusinessOwnerPartnersEligibility", () => {
  const storeOwnerUser = {
    role: "PRO" as const,
    partnerType: "STORE" as const,
    partnerActivities: [] as string[],
  };

  it("allows ORG_OWNER store", () => {
    expect(
      resolveBusinessOwnerPartnersEligibility({
        user: storeOwnerUser,
        proContextRole: "ORG_OWNER",
      }),
    ).toEqual({ eligible: true, partnerType: "STORE" });
  });

  it("allows org employee CLIENT with store context", () => {
    expect(
      resolveBusinessOwnerPartnersEligibility({
        user: { role: "CLIENT", partnerType: null, partnerActivities: [] },
        proContextRole: "ORG_EMPLOYEE",
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "o1", name: "Store", partnerType: "STORE" },
        },
        contextReady: true,
      }),
    ).toEqual({ eligible: true, partnerType: "STORE" });
  });

  it("rejects org employee without resolvable workplace type", () => {
    expect(
      resolveBusinessOwnerPartnersEligibility({
        user: { role: "CLIENT", partnerType: null, partnerActivities: [] },
        proContextRole: "ORG_EMPLOYEE",
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "o1", name: "Store" },
        },
        contextReady: true,
      }),
    ).toEqual({ eligible: false });
  });

  it("rejects MASTER even as org owner", () => {
    expect(
      resolveBusinessOwnerPartnersEligibility({
        user: { role: "PRO", partnerType: "MASTER", partnerActivities: [] },
        proContextRole: "ORG_OWNER",
      }),
    ).toEqual({ eligible: false });
  });
});
