import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Partner1cModelDetail } from "./Partner1cModelDetail";
import { fetchPartnerCatalogSnapshot, snapshotForAudience } from "@/lib/partner-1c-catalog/api";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyOrgEmployeeContext,
} from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";
import { blank } from "@/lib/partner-1c-catalog/lk";
import { clonePublication } from "./publication";
import { demoCatalogBranches } from "@/lib/partner-1c-catalog/demo-branches";

const demoBranches = demoCatalogBranches();
const demoBranch0 = demoBranches[0]!.id;

describe("Partner1cModelDetail permissions", () => {
  const ownerSnap = fetchPartnerCatalogSnapshot(fixtureOptovikOwnerProContext());
  const model = ownerSnap.models.find((m) => m.id === "p004")!;

  it("owner sees закупка panel", () => {
    render(
      <Partner1cModelDetail
        model={model}
        publication={clonePublication(ownerSnap.publication)}
        catalogBranches={ownerSnap.branches}
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
        catalogBranches={snap.branches}
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
    expect(screen.queryByTestId("pc-model-branches")).toBeNull();
    expect(screen.queryByTestId(`pc-branch-meta-${demoBranch0}`)).toBeNull();
  });
});

describe("Partner1cModelDetail model card copy", () => {
  const ownerSnap = fetchPartnerCatalogSnapshot(fixtureOptovikOwnerProContext());
  const model = ownerSnap.models.find((m) => m.id === "p004")!;

  function renderOwner(pub = clonePublication(ownerSnap.publication)) {
    const utils = render(
      <Partner1cModelDetail
        model={model}
        publication={pub}
        catalogBranches={ownerSnap.branches}
        manage
        showCost
        priceType={ownerSnap.priceType}
        filter={blank()}
        onBack={() => {}}
        onPublication={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    return { ...utils, pub };
  }

  it("shows branch stock quantity, price source and markup under branch price", () => {
    renderOwner();
    const branch = screen.getByTestId(`pc-model-branch-${demoBranch0}`);
    expect(within(branch).getByText(/в наличии \d+ шт/)).toBeTruthy();
    expect(screen.getByTestId(`pc-branch-source-${demoBranch0}`).textContent).toBe("как в 1С");
    expect(screen.getByTestId(`pc-branch-markup-${demoBranch0}`).textContent).toMatch(/наценка.*% · \+/);
  });

  it("recalculates branch markup when custom branch price is set", () => {
    let pub = clonePublication(ownerSnap.publication);
    const { rerender } = render(
      <Partner1cModelDetail
        model={model}
        publication={pub}
        catalogBranches={ownerSnap.branches}
        manage
        showCost
        priceType={ownerSnap.priceType}
        filter={blank()}
        onBack={() => {}}
        onPublication={(next) => {
          pub = next;
        }}
        onToggleHidden={() => {}}
      />,
    );
    const input = screen.getByTestId(`pc-branch-price-${demoBranch0}`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "15000" } });
    rerender(
      <Partner1cModelDetail
        model={model}
        publication={pub}
        catalogBranches={ownerSnap.branches}
        manage
        showCost
        priceType={ownerSnap.priceType}
        filter={blank()}
        onBack={() => {}}
        onPublication={(next) => {
          pub = next;
        }}
        onToggleHidden={() => {}}
      />,
    );
    expect(screen.getByTestId(`pc-branch-source-${demoBranch0}`).textContent).toBe("своя цена");
    expect(screen.getByTestId(`pc-branch-markup-${demoBranch0}`).textContent).toContain("+");
  });

  it("shows brand row and section footnotes from the prototype", () => {
    renderOwner();
    expect(screen.getByText("Бренд")).toBeTruthy();
    expect(screen.getByText("Тандор")).toBeTruthy();
    expect(
      screen.getByText(
        /Клиент выбирает размер и цвет на сайте — в заявку попадает конкретная позиция 1С/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Названия и значения свойств приходят из 1С и здесь не редактируются/,
      ),
    ).toBeTruthy();
  });
});