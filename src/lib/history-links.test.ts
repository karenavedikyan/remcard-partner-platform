import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAccrualByRef,
  findAccrualsForPurchase,
  findPurchaseById,
  findPurchaseByOrderId,
  findPurchaseForAccrual,
} from "./history-links.ts";
import type { AccrualRow, PurchaseRow } from "./history-types.ts";

const basePurchase = (overrides: Partial<PurchaseRow>): PurchaseRow => ({
  id: "ord-a",
  orderId: "ord-a",
  bonusId: null,
  source: "issued-order",
  createdAt: "2026-10-01T10:00:00.000Z",
  promoCode: "RC-SAME",
  partnerName: "Shop",
  direction: "issued",
  totalAmount: 1000,
  discountAmount: 50,
  payableAmount: 950,
  orderStatus: "CONFIRMED",
  bonusStatus: null,
  isSelfScan: false,
  clientName: "Client",
  branchName: null,
  executorName: null,
  proBonus: 100,
  linkedAccruals: [],
  linkedAccrualIds: [],
  items: [],
  ...overrides,
});

const baseAccrual = (overrides: Partial<AccrualRow>): AccrualRow => ({
  id: "bonus-a",
  orderId: "ord-a",
  accrualType: "bonus",
  createdAt: "2026-10-01T10:00:00.000Z",
  amount: 100,
  status: "CALCULATED",
  paidAt: null,
  counterpartyName: "Shop",
  promoCode: "RC-SAME",
  isSelfScan: false,
  walletRole: "MASTER",
  scope: "earned",
  items: [],
  ...overrides,
});

describe("history-links typed accrual refs", () => {
  it("does not match purchases by promoCode alone", () => {
    const purchases = [basePurchase({ id: "ord-a", orderId: "ord-a" })];
    assert.equal(findPurchaseByOrderId(purchases, "RC-SAME"), null);
    assert.equal(findPurchaseById(purchases, "RC-SAME"), null);
  });

  it("links all typed accruals for a purchase", () => {
    const purchase = basePurchase({
      linkedAccruals: [
        { id: "bonus-1", type: "bonus" },
        { id: "agent-1", type: "agentBonus" },
      ],
      linkedAccrualIds: ["bonus-1", "agent-1"],
      bonusId: "bonus-1",
    });
    const accruals = [
      baseAccrual({ id: "bonus-1", accrualType: "bonus" }),
      baseAccrual({ id: "agent-1", accrualType: "agentBonus", amount: 40 }),
    ];
    const linked = findAccrualsForPurchase(purchase, accruals);
    assert.equal(linked.length, 2);
    assert.deepEqual(
      linked.map((row) => `${row.accrualType}:${row.id}`).sort(),
      ["agentBonus:agent-1", "bonus:bonus-1"],
    );
  });

  it("does not link accrual when only id matches but type differs", () => {
    const purchase = basePurchase({
      linkedAccruals: [{ id: "shared-id", type: "bonus" }],
    });
    const accruals = [baseAccrual({ id: "shared-id", accrualType: "agentBonus" })];
    assert.equal(findAccrualsForPurchase(purchase, accruals).length, 0);
    assert.equal(findAccrualByRef(accruals, { id: "shared-id", type: "bonus" }), null);
  });

  it("returns no links for self-scan purchase", () => {
    const purchase = basePurchase({
      isSelfScan: true,
      linkedAccruals: [{ id: "bonus-x", type: "bonus" }],
    });
    assert.equal(findAccrualsForPurchase(purchase, [baseAccrual({ id: "bonus-x" })]).length, 0);
  });

  it("finds purchase for accrual by typed ref in loaded list", () => {
    const purchase = basePurchase({
      orderId: "ord-z",
      linkedAccruals: [{ id: "bonus-z", type: "bonus" }],
    });
    const accrual = baseAccrual({ id: "bonus-z", orderId: "ord-z" });
    assert.equal(findPurchaseForAccrual(accrual, [purchase])?.orderId, "ord-z");
  });

  it("does not link two purchases with same promoCode only", () => {
    const first = basePurchase({ id: "ord-1", orderId: "ord-1", promoCode: "RC-DUP" });
    const second = basePurchase({ id: "ord-2", orderId: "ord-2", promoCode: "RC-DUP" });
    const accrual = baseAccrual({ id: "bonus-1", orderId: "ord-2" });
    assert.equal(findPurchaseForAccrual(accrual, [first, second]), null);
  });
});
