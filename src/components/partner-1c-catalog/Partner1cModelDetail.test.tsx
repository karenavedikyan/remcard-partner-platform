import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Partner1cModelDetail } from "./Partner1cModelDetail";
import { fetchPartnerCatalogSnapshot, snapshotForAudience } from "@/lib/partner-1c-catalog/api";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyOrgEmployeeContext,
} from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";
import { blank } from "@/lib/partner-1c-catalog/lk";
import { clonePublication } from "./publication";

describe("Partner1cModelDetail permissions", () => {
  const ownerSnap = fetchPartnerCatalogSnapshot(fixtureOptovikOwnerProContext());
  const model = ownerSnap.models.find((m) => m.id === "p004")!;

  it("owner sees закупка panel", () => {
    render(
      <Partner1cModelDetail
        model={model}
        publication={clonePublication(ownerSnap.publication)}
        manage
        showCost
        priceType={ownerSnap.priceType}
        filter={blank()}
        onBack={() => {}}
        onPublication={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    expect(screen.getByTestId("pc-money")).toBeTruthy();
  });

  it("employee does not render pc-money", () => {
    const employee = fixtureSergeyOrgEmployeeContext({ includeActiveBranchGrant: true });
    employee.effectivePermissions = flagsFromActionIds(["own", "catalog"]);
    const snap = snapshotForAudience(fetchPartnerCatalogSnapshot(employee));
    const m = snap.models.find((x) => x.id === "p004")!;
    render(
      <Partner1cModelDetail
        model={m}
        publication={clonePublication(snap.publication)}
        manage={false}
        showCost={false}
        priceType={snap.priceType}
        filter={blank()}
        onBack={() => {}}
        onPublication={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    expect(screen.queryByTestId("pc-money")).toBeNull();
  });
});