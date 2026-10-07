import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RemcardApiError } from "./api-client";
import { resolveAccrualLookup, type AccrualSourcesSnapshot } from "./history-loader";
import { mergeAccrualRowsById } from "./settlements-mappers";
import type { AccrualRow } from "./history-types";

const walletRow: AccrualRow = {
  id: "shared-id",
  orderId: "o1",
  accrualType: "bonus",
  createdAt: "2026-10-01T10:00:00.000Z",
  amount: 100,
  status: "CONFIRMED",
  paidAt: null,
  counterpartyName: "Shop",
  promoCode: null,
  isSelfScan: false,
  walletRole: "MASTER",
  scope: "earned",
  items: [],
};

const settlementAgentRow: AccrualRow = {
  ...walletRow,
  id: "shared-id",
  accrualType: "agentBonus",
  walletRole: null,
  amount: 200,
};

const settlementOnlyRow: AccrualRow = {
  ...walletRow,
  id: "settle-only",
  accrualType: "agentBonus",
  amount: 75,
};

function snapshot(
  rows: AccrualRow[],
  wallet: AccrualSourcesSnapshot["wallet"],
  settlements: AccrualSourcesSnapshot["settlements"],
  errors: { wallet?: unknown; settlements?: unknown } = {},
): AccrualSourcesSnapshot {
  return {
    rows,
    wallet,
    settlements,
    walletError: errors.wallet ?? null,
    settlementsError: errors.settlements ?? null,
  };
}

describe("mergeAccrualRowsById type-safe keys", () => {
  it("does not overwrite bonus with agentBonus when ids collide", () => {
    const merged = mergeAccrualRowsById([walletRow], [settlementAgentRow]);
    assert.equal(merged.length, 2);
    assert.equal(
      merged.some((row) => row.accrualType === "bonus" && row.amount === 100),
      true,
    );
    assert.equal(
      merged.some((row) => row.accrualType === "agentBonus" && row.amount === 200),
      true,
    );
  });
});

describe("resolveAccrualLookup", () => {
  it("returns row found in merged sources", () => {
    const rows = mergeAccrualRowsById([walletRow], [settlementAgentRow]);
    const found = resolveAccrualLookup(
      snapshot(rows, "ok", "ok"),
      "shared-id",
      "agentBonus",
    );
    assert.equal(found?.accrualType, "agentBonus");
    assert.equal(found?.amount, 200);
  });

  it("throws when wallet ok without row and settlements failed", () => {
    assert.throws(
      () =>
        resolveAccrualLookup(
          snapshot(
            [walletRow],
            "ok",
            "error",
            { settlements: new RemcardApiError(500, "Сбой settlements") },
          ),
          "settle-only",
          "agentBonus",
        ),
      (error: unknown) =>
        error instanceof RemcardApiError && error.message === "Сбой settlements",
    );
  });

  it("allows not-found when both sources succeeded", () => {
    const result = resolveAccrualLookup(snapshot([walletRow], "ok", "ok"), "missing");
    assert.equal(result, null);
  });

  it("allows not-found when wallet unavailable and settlements succeeded", () => {
    const result = resolveAccrualLookup(
      snapshot([settlementOnlyRow], "unavailable", "ok"),
      "missing",
    );
    assert.equal(result, null);
  });

  it("finds settlement-only row when wallet unavailable", () => {
    const result = resolveAccrualLookup(
      snapshot([settlementOnlyRow], "unavailable", "ok"),
      "settle-only",
      "agentBonus",
    );
    assert.equal(result?.amount, 75);
  });

  it("throws when wallet failed and settlements ok but row missing", () => {
    assert.throws(
      () =>
        resolveAccrualLookup(
          snapshot(
            [settlementOnlyRow],
            "error",
            "ok",
            { wallet: new RemcardApiError(500, "Сбой wallet") },
          ),
          "maybe-in-wallet",
        ),
      (error: unknown) =>
        error instanceof RemcardApiError && error.message === "Сбой wallet",
    );
  });

  it("returns null for ambiguous id without type when both types share id", () => {
    const rows = mergeAccrualRowsById([walletRow], [settlementAgentRow]);
    const result = resolveAccrualLookup(snapshot(rows, "ok", "ok"), "shared-id");
    assert.equal(result, null);
  });

  it("disambiguates shared id when accrualType is provided", () => {
    const rows = mergeAccrualRowsById([walletRow], [settlementAgentRow]);
    assert.equal(
      resolveAccrualLookup(snapshot(rows, "ok", "ok"), "shared-id", "bonus")?.amount,
      100,
    );
    assert.equal(
      resolveAccrualLookup(snapshot(rows, "ok", "ok"), "shared-id", "agentBonus")?.amount,
      200,
    );
  });
});
