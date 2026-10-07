import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
