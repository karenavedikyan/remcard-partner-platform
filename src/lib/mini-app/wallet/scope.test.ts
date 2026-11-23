import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMiniAppFixture } from "@/app/dev/mini-app-fixture/fixtures-data";
import {
  miniWalletSettlementsSearchParams,
  profWalletCabinetHref,
} from "./scope";

describe("mini-app wallet scope", () => {
  it("passes branchId only for store/company branch scope", () => {
    const bootstrap = buildMiniAppFixture("store", "telegram", { canCreate: true, canScan: true }, true);
    const scoped = miniWalletSettlementsSearchParams({
      bootstrap,
      ledgerScope: "branch",
      branchId: "b1",
    });
    assert.deepEqual(scoped, { branchId: "b1" });
    const all = miniWalletSettlementsSearchParams({
      bootstrap,
      ledgerScope: "all",
      branchId: "b1",
    });
    assert.equal(all, undefined);
  });

  it("wallet CTA always targets settlements", () => {
    const bootstrap = buildMiniAppFixture("agent", "telegram", { canCreate: true, canScan: false });
    const href = profWalletCabinetHref({
      ...bootstrap,
      presentation: { ...bootstrap.presentation, historyHref: "/history" },
    });
    assert.match(href, /\/settlements$/);
  });
});
