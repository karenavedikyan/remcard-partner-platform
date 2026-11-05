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

  it("allows CLIENT org employee with store context", () => {
    expect(
      resolveBusinessOwnerClientsEligibility({
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
});
