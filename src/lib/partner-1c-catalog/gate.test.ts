import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  canManagePartner1cCatalog,
  partner1cCatalogNavVisible,
} from "./gate";
import { fixtureOptovikOwnerProContext, fixtureSergeyOrgEmployeeContext } from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";

describe("partner1cCatalog gate", () => {
  const prev = process.env.PARTNER_1C_CATALOG_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.PARTNER_1C_CATALOG_ENABLED;
    else process.env.PARTNER_1C_CATALOG_ENABLED = prev;
  });

  it("hidden when feature flag off", () => {
    delete process.env.PARTNER_1C_CATALOG_ENABLED;
    const presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext"> = {
      navMode: "business-company",
      proContext: fixtureOptovikOwnerProContext(),
    };
    expect(partner1cCatalogNavVisible(presentation)).toBe(false);
  });

  it("owner with catalog right sees nav when flag on", () => {
    process.env.PARTNER_1C_CATALOG_ENABLED = "1";
    const presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext"> = {
      navMode: "business-company",
      proContext: fixtureOptovikOwnerProContext(),
    };
    expect(partner1cCatalogNavVisible(presentation)).toBe(true);
    expect(canManagePartner1cCatalog(presentation.proContext)).toBe(true);
  });

  it("employee without catalog right denied", () => {
    process.env.PARTNER_1C_CATALOG_ENABLED = "1";
    const employee = fixtureSergeyOrgEmployeeContext({ canManageLeads: true });
    expect(canManagePartner1cCatalog(employee)).toBe(false);
  });

  it("employee with catalog right sees nav when flag on", () => {
    process.env.PARTNER_1C_CATALOG_ENABLED = "1";
    const employee = fixtureSergeyOrgEmployeeContext({ canManageLeads: true });
    employee.effectivePermissions = flagsFromActionIds(["own", "catalog"]);
    const presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext"> = {
      navMode: "business-company",
      proContext: employee,
    };
    expect(partner1cCatalogNavVisible(presentation)).toBe(true);
  });
});