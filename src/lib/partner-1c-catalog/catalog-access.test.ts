import { describe, expect, it } from "vitest";
import { catalogUiAccessFromNavigator } from "./catalog-access";
import { fixtureSergeyOrgEmployeeContext } from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";

describe("catalog list UI access", () => {
  it("treats missing active branch as hint, not denial", () => {
    const employee = fixtureSergeyOrgEmployeeContext({ includeActiveBranchGrant: true });
    employee.effectivePermissions = flagsFromActionIds(["own", "catalog"]);
    (employee as { activeBranch: null }).activeBranch = null;
    const access = catalogUiAccessFromNavigator(
      { enabled: true, canAccess: true, isOwner: false },
      employee,
      "",
    );
    expect(access.canOpenWorkspace).toBe(true);
    expect(access.branchHint).toBe("pick-active-branch");
    expect(access.showBranchRetailPrices).toBe(false);
  });

  it("does not infer workspace denial from generic error without FORBIDDEN code", () => {
    const access = catalogUiAccessFromNavigator(
      { enabled: true, canAccess: false, code: "PUBLICATION_LOCKED", error: "Снимок публикации недоступен" },
      null,
      "",
    );
    expect(access.canOpenWorkspace).toBe(true);
    expect(access.publicationPricesBlocked).toBe(true);
  });
});