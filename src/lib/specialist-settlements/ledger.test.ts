import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SettlementCompleted, SettlementObligation } from "@/lib/settlements-types";
import {
  buildExportRows,
  clampPage,
  defaultLedgerFilters,
  directionTotal,
  filterCompletedForPeriod,
  filterOpenObligations,
  paginateRows,
  partnerCompletedHistory,
  partnerGroupsForDirection,
  reconciliationSummary,
  resolveExportScope,
  validateLedgerPeriod,
} from "./ledger";
import { instantInMskCalendarRange } from "./mskCalendar";

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

  it("export from partner A excludes partner B across all matching rows", () => {
    const receivable = [
      row({ id: "a1", counterpartyId: "A", counterpartyName: "A", amount: 10 }),
      row({ id: "b1", counterpartyId: "B", counterpartyName: "B", amount: 20 }),
    ];
    const filters = defaultLedgerFilters();
    const exported = buildExportRows(receivable, [], "receivable", filters, "A");
    assert.equal(exported.length, 1);
    assert.equal(exported[0]?.counterparty, "A");
  });

  it("reconciliation excludes rows outside period and unknown paidAt", () => {
    const completed: SettlementCompleted[] = [
      {
        ...row({ id: "in", amount: 50, createdAt: "2026-09-01T10:00:00.000Z" }),
        paidAt: "2026-10-05T10:00:00.000Z",
        direction: "receivable",
      },
      {
        ...row({ id: "out", amount: 99, createdAt: "2026-10-01T10:00:00.000Z" }),
        paidAt: "2026-11-01T10:00:00.000Z",
        direction: "receivable",
      },
      {
        ...row({ id: "legacy", amount: 30, createdAt: "2026-10-02T10:00:00.000Z" }),
        paidAt: null,
        direction: "payable",
      },
    ];
    const recon = reconciliationSummary(completed, {
      q: "",
      from: "2026-10-01",
      to: "2026-10-31",
      sort: "date-desc",
    });
    assert.equal(recon.receivableTotal, 50);
    assert.equal(recon.rows.length, 1);
    assert.equal(recon.excludedUnknownPaidAt, 1);
    const periodOnly = filterCompletedForPeriod(completed, "both", {
      q: "",
      from: "2026-10-01",
      to: "2026-10-31",
    });
    assert.equal(periodOnly.inPeriod.length, 1);
    assert.equal(periodOnly.excludedUnknownPaidAt, 1);
  });

  it("clamps page when filters shrink result set on page 2", () => {
    const payable = Array.from({ length: 11 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return row({
        id: `pay-${n}`,
        counterpartyId: `PARTNER_${n}`,
        counterpartyName: `PARTNER_${n}`,
        createdAt: `2026-10-${10 + i}T10:00:00.000Z`,
      });
    });
    const allGroups = partnerGroupsForDirection([], payable, [], "payable", defaultLedgerFilters());
    assert.equal(allGroups.length, 11);
    const narrowed = partnerGroupsForDirection([], payable, [], "payable", {
      ...defaultLedgerFilters(),
      from: "2026-10-11",
    });
    assert.ok(narrowed.some((g) => g.counterpartyId === "PARTNER_11"));
    const clamped = clampPage(2, narrowed, 10);
    assert.equal(clamped, 1);
    assert.ok(
      paginateRows(narrowed, clamped, 10).some((g) => g.counterpartyId === "PARTNER_11"),
    );
  });

  it("sorts partner groups by amount ascending, not alphabetically", () => {
    const receivable = [
      row({
        id: "a",
        counterpartyId: "A",
        counterpartyName: "A",
        amount: 100,
      }),
      row({
        id: "z",
        counterpartyId: "Z",
        counterpartyName: "Z",
        amount: 1,
      }),
    ];
    const filters = { ...defaultLedgerFilters(), sort: "amount-asc" as const };
    const groups = partnerGroupsForDirection(receivable, [], [], "receivable", filters);
    assert.equal(groups[0]?.counterpartyId, "Z");
    assert.equal(groups[1]?.counterpartyId, "A");
  });

  it("uses MSK calendar day for period boundaries", () => {
    assert.equal(
      instantInMskCalendarRange("2026-10-21T21:30:00.000Z", "2026-10-22", "2026-10-22"),
      true,
    );
  });

  it("lists completed-only partner when status is all", () => {
    const completed = [
      {
        ...row({ id: "c1", counterpartyId: "CLOSED", counterpartyName: "CLOSED" }),
        paidAt: "2026-10-05T10:00:00.000Z",
        direction: "receivable" as const,
        status: "PAID",
      },
    ];
    const groups = partnerGroupsForDirection([], [], completed, "receivable", {
      ...defaultLedgerFilters(),
      status: "all",
    });
    assert.ok(groups.some((g) => g.counterpartyId === "CLOSED" && g.completedOnly));
  });

  it("maps export scope from active screen", () => {
    assert.equal(resolveExportScope("partnerHistory"), "partnerHistory");
    assert.equal(resolveExportScope("reconciliation"), "reconciliation");
    assert.equal(resolveExportScope("orders"), "open");
  });

  it("reconciliation search filters rows and totals together", () => {
    const completed: SettlementCompleted[] = [
      {
        ...row({ id: "a", counterpartyId: "ONLY_A", counterpartyName: "ONLY_A", amount: 40 }),
        paidAt: "2026-10-05T10:00:00.000Z",
        direction: "receivable",
        status: "PAID",
      },
      {
        ...row({ id: "b", counterpartyId: "ONLY_B", counterpartyName: "ONLY_B", amount: 90 }),
        paidAt: "2026-10-06T10:00:00.000Z",
        direction: "receivable",
        status: "PAID",
      },
    ];
    const all = reconciliationSummary(completed, {
      q: "",
      from: "",
      to: "",
      sort: "date-desc",
    });
    const filtered = reconciliationSummary(completed, {
      q: "ONLY_A",
      from: "",
      to: "",
      sort: "date-desc",
    });
    assert.equal(all.receivableTotal, 130);
    assert.equal(filtered.receivableTotal, 40);
    assert.equal(filtered.rows.length, 1);
    assert.equal(filtered.rows[0]?.counterpartyName, "ONLY_A");
  });

  it("partner history and reconciliation sort matches amount and date modes", () => {
    const completed: SettlementCompleted[] = [
      {
        ...row({ id: "h1", counterpartyId: "P1", amount: 200 }),
        paidAt: "2026-10-02T10:00:00.000Z",
        direction: "receivable",
        status: "PAID",
      },
      {
        ...row({ id: "h2", counterpartyId: "P1", amount: 100 }),
        paidAt: "2026-10-01T10:00:00.000Z",
        direction: "receivable",
        status: "PAID",
      },
    ];
    const asc = partnerCompletedHistory(completed, "receivable", "P1", {
      ...defaultLedgerFilters(),
      sort: "amount-asc",
    });
    assert.deepEqual(
      asc.inPeriod.map((row) => row.amount),
      [100, 200],
    );
    const reconDesc = reconciliationSummary(completed, {
      q: "",
      from: "",
      to: "",
      sort: "date-desc",
    });
    assert.equal(reconDesc.rows[0]?.id, "h1");
  });

  it("validates invalid period range", () => {
    assert.match(
      validateLedgerPeriod("2026-10-12", "2026-10-01") ?? "",
      /не может быть позже/i,
    );
    assert.equal(validateLedgerPeriod("2026-10-01", "2026-10-12"), null);
  });
});
