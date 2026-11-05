import { describe, expect, it } from "vitest";
import { resolveBusinessSectionDispatch } from "./dispatch-priority";
import { storeOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";

describe("resolveBusinessSectionDispatch regression matrix", () => {
  it("org CLIENT employee: business before r03", () => {
    expect(
      resolveBusinessSectionDispatch({
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
      }),
    ).toEqual({ kind: "business", partnerType: "STORE" });
  });

  it("PRO MASTER org STORE employee: business before r03/r06", () => {
    expect(
      resolveBusinessSectionDispatch({
        user: {
          id: "e2",
          displayName: "Master staff",
          role: "PRO",
          partnerType: "MASTER",
          partnerActivities: ["MASTER", "AGENT"],
        },
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        },
        contextReady: true,
        r03Eligible: true,
        r06Eligible: true,
        surface: "clients",
      }),
    ).toEqual({ kind: "business", partnerType: "STORE" });
  });

  it("PRO store ORG_OWNER keeps r03 before business", () => {
    expect(
      resolveBusinessSectionDispatch({
        user: {
          id: "o1",
          displayName: "Owner",
          role: "PRO",
          partnerType: "STORE",
          partnerActivities: ["STORE", "AGENT"],
        },
        proContext: {
          role: "ORG_OWNER",
          organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        },
        contextReady: true,
        r03Eligible: true,
        r06Eligible: false,
        surface: "issuer",
      }),
    ).toEqual({ kind: "agent-r03" });
  });

  it("personal PRO agent without org context uses r03", () => {
    expect(
      resolveBusinessSectionDispatch({
        user: {
          id: "a1",
          displayName: "Agent",
          role: "PRO",
          partnerType: "STORE",
          partnerActivities: ["AGENT"],
        },
        proContext: null,
        contextReady: false,
        r03Eligible: true,
        r06Eligible: false,
        surface: "clients",
      }),
    ).toEqual({ kind: "agent-r03" });
  });
});
