import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { sanitizeMiniAppWalletSettlements } from "./sanitize";

describe("sanitizeMiniAppWalletSettlements", () => {
  it("hides payable for agent incoming-only", () => {
    const response = sanitizeMiniAppWalletSettlements(
      {
        receivable: [
          {
            id: "a",
            orderId: "o",
            accrualType: "bonus",
            counterpartyId: "s",
            counterpartyName: "Store",
            amount: 1,
            basis: "x",
            status: "CONFIRMED",
            createdAt: "2026-01-01T00:00:00.000Z",
            payoutActions: { canRecordCash: true, canRecordTransfer: false },
          },
        ],
        payable: [
          {
            id: "p",
            orderId: "o2",
            accrualType: "bonus",
            counterpartyId: "x",
            counterpartyName: "X",
            amount: 2,
            basis: "y",
            status: "CONFIRMED",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        completed: [
          {
            id: "c",
            orderId: "o3",
            accrualType: "bonus",
            counterpartyId: "x",
            counterpartyName: "X",
            amount: 3,
            basis: "z",
            status: "PAID",
            createdAt: "2026-01-01T00:00:00.000Z",
            paidAt: "2026-02-01T00:00:00.000Z",
            direction: "payable",
          },
        ],
        coverageNote: "",
      },
      true,
    );
    assert.deepEqual(response.payable, []);
    assert.equal(response.receivable[0]?.payoutActions, undefined);
    assert.equal(response.completed.length, 0);
  });
});
