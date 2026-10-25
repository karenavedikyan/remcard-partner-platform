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

  it("rejects org employee", () => {
    expect(
      resolveBusinessOwnerPartnersEligibility({
        user: storeOwnerUser,
        proContextRole: "ORG_EMPLOYEE",
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
