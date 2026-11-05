import { describe, expect, it } from "vitest";
import { resolveBusinessSectionDispatch } from "./dispatch-priority";
import { storeOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";

describe("resolveBusinessSectionDispatch", () => {
  it("prefers business clients for CLIENT org employee even when r03 flags are on", () => {
    const decision = resolveBusinessSectionDispatch({
      user: {
        id: "e1",
        displayName: "Staff",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
      },
      proContext: storeOrgEmployeeContext,
      contextReady: true,
      r03Eligible: true,
      r06Eligible: false,
      surface: "clients",
    });
    expect(decision).toEqual({ kind: "business", partnerType: "STORE" });
  });

  it("keeps r03 first for PRO store owner with agent eligibility", () => {
    const decision = resolveBusinessSectionDispatch({
      user: {
        id: "o1",
        displayName: "Owner",
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE", "AGENT"],
      },
      proContext: {
        role: "ORG_OWNER",
        organization: { id: "org1", name: "Store", partnerType: "STORE" },
      },
      contextReady: true,
      r03Eligible: true,
      r06Eligible: false,
      surface: "issuer",
    });
    expect(decision).toEqual({ kind: "agent-r03" });
  });
});
