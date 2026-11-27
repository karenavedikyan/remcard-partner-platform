import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Partner1cCatalogWorkspace } from "@/components/partner-1c-catalog/Partner1cCatalogWorkspace";
import {
  assertNoOwnerEconomicsInValue,
  fetchPartnerCatalogSnapshot,
  snapshotForAudience,
  stripCostFromModels,
} from "@/lib/partner-1c-catalog/api";
import { buildPartnerModels } from "@/lib/partner-1c-catalog/models";
import { defaultPublicationState } from "@/lib/partner-1c-catalog/models";
import { optovikFixtureProducts } from "@/lib/partner-1c-catalog/fixtures";
import { emptyCatalogListUiAccess } from "@/lib/partner-1c-catalog/catalog-access";

describe("catalog employee fixture snapshot", () => {
  const employeeSnap = snapshotForAudience({
    ...fetchPartnerCatalogSnapshot(null),
    manage: false,
    models: stripCostFromModels(buildPartnerModels(optovikFixtureProducts())),
    publication: defaultPublicationState(),
    access: { ...emptyCatalogListUiAccess("employee-fixture"), canSeeOwnerEconomics: false },
  });

  it("JSON snapshot has no owner-only economics fields", () => {
    expect(() => assertNoOwnerEconomicsInValue(employeeSnap)).not.toThrow();
    expect(employeeSnap.models.every((m) => m.cost == null)).toBe(true);
  });

  it("employee workspace DOM has no purchase or branches panels", () => {
    render(<Partner1cCatalogWorkspace snapshot={employeeSnap} />);
    expect(screen.queryByTestId("pc-cost-toggle")).toBeNull();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/purchasePrice|internalPrices|"cost":\s*[1-9]/);
    expect(html).not.toContain("Закупка и наценка");
  });
});