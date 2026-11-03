import { describe, expect, it } from "vitest";
import { isAgentReceivablesOverviewEmpty, isWalletSettlementsDataEmpty } from "./is-empty";

describe("isWalletSettlementsDataEmpty", () => {
  it("is false when any ledger bucket has rows", () => {
    expect(
      isWalletSettlementsDataEmpty({
        coverageNote: "",
        receivable: [],
        payable: [],
        completed: [
          {
            id: "c1",
            orderId: "o1",
            accrualType: "bonus",
            counterpartyId: "p1",
            counterpartyName: "P",
            amount: 1,
            basis: "b",
            status: "PAID",
            createdAt: "2026-01-01T00:00:00.000Z",
            paidAt: "2026-01-02T00:00:00.000Z",
            direction: "receivable",
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("isAgentReceivablesOverviewEmpty", () => {
  it("is overview-only signal", () => {
    expect(
      isAgentReceivablesOverviewEmpty({
        contractVersion: "1",
        confirmedTotalKopecks: 0,
        openCount: 0,
        pendingCount: 0,
        coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
      }),
    ).toBe(true);
  });
});
