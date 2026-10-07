import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupObligationsByCounterparty,
  mapSettlementsToAccrualRows,
  mergeAccrualRowsById,
  sumObligationAmounts,
} from "./settlements-mappers";
import type { AccrualRow } from "./history-types";
import type { SettlementObligation } from "./settlements-types";

const baseRow = (overrides: Partial<SettlementObligation>): SettlementObligation => ({
  id: "b1",
  orderId: "o1",
  accrualType: "bonus",
  counterpartyId: "p1",
  counterpartyName: "Alpha Shop",
  amount: 100,
  basis: "Сертификат RC-1",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
});

describe("groupObligationsByCounterparty", () => {
  it("groups by counterpartyId and sums amounts", () => {
    const groups = groupObligationsByCounterparty([
      baseRow({ id: "b1", amount: 100 }),
      baseRow({ id: "b2", amount: 50, basis: "Сертификат RC-2" }),
      baseRow({
        id: "b3",
        counterpartyId: "p2",
        counterpartyName: "Beta",
        amount: 200,
      }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.counterpartyId, "p1");
    assert.equal(groups[0]?.totalAmount, 150);
    assert.equal(groups[0]?.items.length, 2);
    assert.equal(groups[1]?.counterpartyId, "p2");
  });

  it("keeps partners separate even when names match", () => {
    const groups = groupObligationsByCounterparty([
      baseRow({ id: "b1", counterpartyId: "p1", counterpartyName: "Shop" }),
      baseRow({ id: "b2", counterpartyId: "p2", counterpartyName: "Shop", amount: 80 }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(sumObligationAmounts(groups.flatMap((g) => g.items)), 180);
  });
});

describe("mapSettlementsToAccrualRows", () => {
  it("maps both directions for accrual detail merge", () => {
    const rows = mapSettlementsToAccrualRows({
      receivable: [baseRow({ id: "r1" })],
      payable: [baseRow({ id: "p1", counterpartyId: "pro-1" })],
      completed: [],
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.scope, "earned");
    assert.equal(rows[1]?.scope, "payable-to-pros");
  });
});

describe("mergeAccrualRowsById", () => {
  it("adds settlement-only accruals without duplicating wallet rows", () => {
    const walletRow: AccrualRow = {
      id: "b1",
      orderId: "o1",
      accrualType: "bonus",
      createdAt: "2026-10-01T10:00:00.000Z",
      amount: 100,
      status: "CONFIRMED",
      paidAt: null,
      counterpartyName: "Shop",
      promoCode: "RC-1",
      isSelfScan: false,
      walletRole: "MASTER",
      scope: "earned",
      items: [],
    };
    const merged = mergeAccrualRowsById(
      [walletRow],
      mapSettlementsToAccrualRows({
        receivable: [baseRow({ id: "b1" })],
        payable: [baseRow({ id: "p-only", counterpartyId: "pro-9" })],
        completed: [],
      }),
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((row) => row.id === "b1")?.walletRole, "MASTER");
  });
});
