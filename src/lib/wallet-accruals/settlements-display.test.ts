import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyClientIncomingOnlySettlementsView,
  publicSettlementsCoverageNote,
} from "@/lib/wallet-accruals/settlements-display";

describe("settlements display helpers", () => {
  it("hides R05 internal coverageNote prefix", () => {
    assert.equal(publicSettlementsCoverageNote("R05: incoming-only view"), null);
    assert.equal(publicSettlementsCoverageNote("Показаны подтверждённые покупки."), "Показаны подтверждённые покупки.");
  });

  it("incoming-only client view strips payable and payoutActions", () => {
    const view = applyClientIncomingOnlySettlementsView({
      coverageNote: "",
      receivable: [
        {
          id: "a",
          orderId: "o",
          accrualType: "bonus",
          counterpartyId: "c",
          counterpartyName: "X",
          amount: 10,
          basis: "b",
          status: "CONFIRMED",
          createdAt: "2026-01-01T00:00:00.000Z",
          payoutActions: { canRecordCash: true, canRecordTransfer: false },
        },
      ],
      payable: [{ id: "p", orderId: "o2", accrualType: "bonus", counterpartyId: "c", counterpartyName: "Y", amount: 5, basis: "b", status: "CONFIRMED", createdAt: "2026-01-01T00:00:00.000Z" }],
      completed: [
        {
          id: "c1",
          orderId: "o3",
          accrualType: "bonus",
          counterpartyId: "c",
          counterpartyName: "Z",
          amount: 1,
          basis: "b",
          status: "PAID",
          createdAt: "2026-01-01T00:00:00.000Z",
          direction: "payable",
          paidAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    });
    assert.equal(view.payable.length, 0);
    assert.equal(view.receivable[0]?.payoutActions, undefined);
    assert.equal(view.completed.length, 0);
  });
});
