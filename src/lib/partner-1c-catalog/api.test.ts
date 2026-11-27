import { describe, expect, it } from "vitest";
import { fetchPartnerCatalogSnapshot, snapshotForAudience } from "./api";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyOrgEmployeeContext,
} from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";

describe("partner catalog mock api", () => {
  it("owner snapshot includes cost", () => {
    const snap = fetchPartnerCatalogSnapshot(fixtureOptovikOwnerProContext());
    expect(snap.manage).toBe(true);
    expect(snap.models.some((m) => m.cost != null)).toBe(true);
  });

  it("employee snapshot strips cost from models", () => {
    const employee = fixtureSergeyOrgEmployeeContext({
      canManageLeads: true,
      includeActiveBranchGrant: true,
    });
    employee.effectivePermissions = flagsFromActionIds(["own", "clients", "catalog"]);
    const snap = snapshotForAudience(fetchPartnerCatalogSnapshot(employee));
    expect(snap.manage).toBe(false);
    expect(snap.models.every((m) => m.cost == null)).toBe(true);
  });
});