import { describe, expect, it } from "vitest";
import { authorizePartnershipListRead } from "./partnership-list-auth";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyAuthUser,
  fixtureSergeyOrgEmployeeContext,
  FIXTURE_OPTOVIK_OWNER_PRO_ID,
  FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID,
} from "./fixtures";

describe("authorizePartnershipListRead", () => {
  it("allows CLIENT org employee (Sergey) organization list read", () => {
    const result = authorizePartnershipListRead({
      user: fixtureSergeyAuthUser(),
      proContext: fixtureSergeyOrgEmployeeContext(),
      contextReady: true,
    });
    expect(result).toEqual({
      allowed: true,
      mode: "organization",
      readContext: expect.objectContaining({
        organizationId: expect.any(String),
        principalProUserId: FIXTURE_OPTOVIK_OWNER_PRO_ID,
        partnerType: "COMPANY",
        readOnlyActor: true,
      }),
    });
  });

  it("denies CLIENT without org context (legacy PRO gate)", () => {
    expect(
      authorizePartnershipListRead({
        user: fixtureSergeyAuthUser(),
        proContext: null,
        contextReady: false,
      }),
    ).toEqual({ allowed: false, reason: "pro_gate" });
  });

  it("keeps PRO solo personal list on actor id", () => {
    const result = authorizePartnershipListRead({
      user: {
        id: "solo-agent",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
      },
      proContext: { role: "SOLO_PARTNER" },
      contextReady: true,
    });
    expect(result).toEqual({ allowed: true, mode: "personal-pro", principalUserId: "solo-agent" });
  });

  it("allows PRO org owner organization read", () => {
    const result = authorizePartnershipListRead({
      user: {
        id: FIXTURE_OPTOVIK_OWNER_PRO_ID,
        role: "PRO",
        partnerType: "COMPANY",
        partnerActivities: ["COMPANY"],
      },
      proContext: fixtureOptovikOwnerProContext(),
      contextReady: true,
    });
    expect(result.allowed).toBe(true);
    if (result.allowed && result.mode === "organization") {
      expect(result.readContext.readOnlyActor).toBe(false);
    }
  });

  it("denies suspended partner employee", () => {
    expect(
      authorizePartnershipListRead({
        user: fixtureSergeyAuthUser(),
        proContext: { role: "PARTNER_EMPLOYEE_SUSPENDED" },
        contextReady: true,
      }),
    ).toEqual({ allowed: false, reason: "suspended" });
  });

  it("denies cross-org malformed context (missing ownerId)", () => {
    expect(
      authorizePartnershipListRead({
        user: { id: FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID, role: "CLIENT" },
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "org-x", name: "X", partnerType: "COMPANY" },
        },
        contextReady: true,
      }),
    ).toEqual({ allowed: false, reason: "pro_gate" });
  });
});
