import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { purchaseRowDateLabel } from "./history-labels.ts";
import type { PurchaseRow } from "./history-types.ts";

const baseRow: PurchaseRow = {
  id: "1",
  source: "issued-order",
  orderId: "ord-1",
  bonusId: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  promoCode: "RC-1",
  partnerName: "Shop",
  direction: "issued",
  totalAmount: 100,
  discountAmount: 5,
  payableAmount: 95,
  orderStatus: "CONFIRMED",
  bonusStatus: null,
  isSelfScan: false,
  clientName: null,
  branchName: null,
  proBonus: 10,
  items: [],
};

describe("purchaseRowDateLabel", () => {
  it("labels issued-order date as purchase date", () => {
    assert.equal(purchaseRowDateLabel(baseRow), "Дата покупки");
  });

  it("labels accepted-bonus date as accrual date", () => {
    assert.equal(
      purchaseRowDateLabel({ ...baseRow, source: "accepted-bonus", direction: "accepted" }),
      "Дата начисления",
    );
  });
});
