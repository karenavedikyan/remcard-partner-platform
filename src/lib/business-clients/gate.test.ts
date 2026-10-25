import { describe, expect, it } from "vitest";
import { resolveBusinessOwnerClientsEligibility } from "./gate";

describe("resolveBusinessOwnerClientsEligibility", () => {
  it("allows store org owner", () => {
    expect(
      resolveBusinessOwnerClientsEligibility({
        user: { role: "PRO", partnerType: "STORE", partnerActivities: [] },
        proContextRole: "ORG_OWNER",
      }),
    ).toEqual({ eligible: true, partnerType: "STORE" });
  });

  it("rejects employee", () => {
    expect(
      resolveBusinessOwnerClientsEligibility({
        user: { role: "PRO", partnerType: "STORE", partnerActivities: [] },
        proContextRole: "ORG_EMPLOYEE",
      }),
    ).toEqual({ eligible: false });
  });
});
