import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SettlementsResponse } from "@/lib/settlements-types";
import {
  buildWalletHistoryRows,
  filterWalletHistoryRows,
  sumHistoryRowAmounts,
  walletCardTotals,
} from "@/lib/wallet-accruals/map-history";
import { confirmedUnpaidRub, waitingRub } from "@/lib/wallet-accruals/amounts";

const fixture: SettlementsResponse = {
  receivable: [
    {
      id: "b1",
      orderId: "ord-1",
      accrualType: "bonus",
      counterpartyId: "store-1",
      counterpartyName: "Магазин",
      amount: 4500,
      basis: "Отделка",
      status: "CONFIRMED",
      createdAt: "2026-10-01T10:00:00.000Z",
      pendingAmount: 2500,
      confirmationAt: "2026-11-12T10:00:00.000Z",
    },
  ],
  payable: [],
  completed: [],
  coverageNote: "",
};

describe("wallet accruals mappers", () => {
  it("card totals count confirmed unpaid and waiting separately", () => {
    const data = {
      receivable: fixture.receivable,
      payable: fixture.payable,
      completed: fixture.completed,
    };
    const totals = walletCardTotals(data, "in");
    assert.equal(totals.confirmedUnpaid, 4500);
    assert.equal(totals.waiting, 2500);
  });

  it("history rows split waiting and confirmed buckets", () => {
    const data = {
      receivable: fixture.receivable,
      payable: fixture.payable,
      completed: fixture.completed,
    };
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.equal(rows.length, 2);
    assert.ok(rows.some((r) => r.kind === "waiting" && r.amount === 2500));
    assert.ok(rows.some((r) => r.kind === "confirmed" && r.amount === 4500));
  });

  it("agent incoming-only skips payable history direction", () => {
    const data = {
      receivable: [],
      payable: [
        {
          ...fixture.receivable[0]!,
          id: "p1",
        },
      ],
      completed: [
        {
          ...fixture.receivable[0]!,
          id: "c1",
          paidAt: "2026-10-20T10:00:00.000Z",
          direction: "payable" as const,
          status: "PAID",
        },
      ],
    };
    const rows = buildWalletHistoryRows(data, "in", true);
    assert.equal(rows.length, 0);
  });

  it("amount helpers never mix buckets", () => {
    const row = fixture.receivable[0]!;
    assert.equal(confirmedUnpaidRub(row), 4500);
    assert.equal(waitingRub(row), 2500);
  });

  it("received filter only includes paid-in rows", () => {
    const data = {
      receivable: fixture.receivable,
      payable: [],
      completed: [
        {
          ...fixture.receivable[0]!,
          id: "paid-1",
          paidAt: "2026-10-22T10:00:00.000Z",
          direction: "receivable" as const,
          amount: 1000,
          status: "PAID",
        },
      ],
    };
    const rows = buildWalletHistoryRows(data, "in", false);
    const filtered = filterWalletHistoryRows(rows, "received", "in");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.kind, "received");
    assert.equal(sumHistoryRowAmounts(filtered), 1000);
  });
});
