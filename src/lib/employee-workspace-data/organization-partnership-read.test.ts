import { describe, expect, it } from "vitest";
import { partnerDisplayTitle } from "@/lib/agent-r04/partner-filters";
import {
  organizationPartnershipReadContextFromProContext,
  partnerSideFromOrganizationReadContext,
  resolvePartnershipListPrincipalUserId,
} from "./organization-partnership-read";
import {
  fixtureOptovikPartnershipRows,
  fixtureSergeyAuthUser,
  fixtureSergeyOrgEmployeeContext,
  FIXTURE_OPTOVIK_OWNER_PRO_ID,
  FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID,
} from "./fixtures";

describe("organization partnership read subject", () => {
  it("resolves Sergey read context with owner principal", () => {
    const ctx = organizationPartnershipReadContextFromProContext({
      proContext: fixtureSergeyOrgEmployeeContext(),
      contextReady: true,
      actorUserId: FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID,
    });
    expect(ctx?.principalProUserId).toBe(FIXTURE_OPTOVIK_OWNER_PRO_ID);
    expect(ctx?.readOnlyActor).toBe(true);
    const proContext = fixtureSergeyOrgEmployeeContext();
    expect(proContext.organization?.storeCategories).toEqual(["doors", "handles"]);
    const side = partnerSideFromOrganizationReadContext(ctx!);
    expect(side.partnerType).toBe("COMPANY");
    expect(side.id).toBe(FIXTURE_OPTOVIK_OWNER_PRO_ID);
    expect(side.storeCategories).toEqual(["doors", "flooring", "handles"]);
    expect(side.partnerActivities).toEqual(["STORE", "AGENT"]);
    expect(ctx?.storeCategories).toEqual(["doors", "flooring", "handles"]);
  });

  it("shows counterparty labels relative to org principal, not employee id", () => {
    const principalId = resolvePartnershipListPrincipalUserId({
      actorUserId: fixtureSergeyAuthUser().id,
      organizationReadContext: organizationPartnershipReadContextFromProContext({
        proContext: fixtureSergeyOrgEmployeeContext(),
        contextReady: true,
        actorUserId: FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID,
      }),
    });
    expect(principalId).toBe(FIXTURE_OPTOVIK_OWNER_PRO_ID);
    const row = fixtureOptovikPartnershipRows()[0];
    const title = partnerDisplayTitle(row, principalId);
    expect(title.official).toBe("Альфа");
    expect(title.official).not.toBe("ОПТОВИК");
  });
});
