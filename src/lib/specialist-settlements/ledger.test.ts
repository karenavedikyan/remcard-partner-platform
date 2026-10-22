import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SettlementObligation } from "@/lib/settlements-types";
import {
  buildExportRows,
  defaultLedgerFilters,
  directionTotal,
  filterOpenObligations,
  paginateRows,
  partnerGroupsForDirection,
} from "./ledger";

const row = (overrides: Partial<SettlementObligation>): SettlementObligation => ({
  id: "b1",
  orderId: "o1",
  accrualType: "bonus",
  counterpartyId: "p1",
  counterpartyName: "Alpha",
  amount: 100,
  basis: "Сертификат RC-1",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
});

describe("specialist-settlements ledger", () => {
  it("counts receivable and payable totals separately without netting", () => {
    const receivable = [row({ id: "r1", amount: 300 })];
    const payable = [row({ id: "p1", amount: 80 })];
    assert.equal(directionTotal(receivable, payable, "receivable"), 300);
    assert.equal(directionTotal(receivable, payable, "payable"), 80);
  });

  it("excludes PAID and CANCELLED from open totals and filters", () => {
    const receivable = [
      row({ id: "open", amount: 50 }),
      row({ id: "paid", amount: 999, status: "PAID" }),
      row({ id: "cancel", amount: 888, status: "CANCELLED" }),
    ];
    const filters = defaultLedgerFilters();
    assert.equal(filterOpenObligations(receivable, filters).length, 1);
    assert.equal(directionTotal(receivable, [], "receivable"), 50);
  });

  it("paginates after filtering and export uses full selection", () => {
    const receivable = [
      row({ id: "a", amount: 10, createdAt: "2026-10-01T10:00:00.000Z" }),
      row({ id: "b", amount: 20, createdAt: "2026-10-02T10:00:00.000Z" }),
      row({ id: "c", amount: 30, createdAt: "2026-10-03T10:00:00.000Z" }),
    ];
    const filters = defaultLedgerFilters();
    const page1 = paginateRows(filterOpenObligations(receivable, filters), 1, 2);
    assert.equal(page1.length, 2);
    const exported = buildExportRows(receivable, [], "receivable", filters);
    assert.equal(exported.length, 3);
  });

  it("groups partners per direction", () => {
    const receivable = [
      row({ id: "1", counterpartyId: "s1", counterpartyName: "Shop", amount: 100 }),
      row({ id: "2", counterpartyId: "s1", counterpartyName: "Shop", amount: 50 }),
    ];
    const payable = [row({ id: "3", counterpartyId: "m1", counterpartyName: "Master", amount: 80 })];
    const filters = defaultLedgerFilters();
    const recvGroups = partnerGroupsForDirection(receivable, payable, "receivable", filters);
    assert.equal(recvGroups.length, 1);
    assert.equal(recvGroups[0]?.totalAmount, 150);
    const payGroups = partnerGroupsForDirection(receivable, payable, "payable", filters);
    assert.equal(payGroups.length, 1);
    assert.equal(payGroups[0]?.totalAmount, 80);
  });
});
