import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAccrualsForPurchase,
  findPurchaseById,
  findPurchaseByOrderId,
  findPurchaseForAccrual,
} from "./history-links.ts";
import type { AccrualRow, PurchaseRow } from "./history-types.ts";

const issuedA: PurchaseRow = {
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
  proBonus: 100,
  items: [],
};

const issuedB: PurchaseRow = {
  ...issuedA,
  id: "ord-b",
  orderId: "ord-b",
  proBonus: 80,
};

const acceptedBonus: PurchaseRow = {
  id: "bonus-1",
  orderId: null,
  bonusId: "bonus-1",
  source: "accepted-bonus",
  createdAt: "2026-10-01T11:00:00.000Z",
  promoCode: "RC-SAME",
  partnerName: "PRO",
  direction: "accepted",
  totalAmount: 600,
  discountAmount: 30,
  payableAmount: 570,
  orderStatus: null,
  bonusStatus: "CALCULATED",
  isSelfScan: false,
  clientName: "Client",
  branchName: null,
  proBonus: 60,
  items: [],
};

const accrualA: AccrualRow = {
  id: "bonus-a",
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
};

const accrualB: AccrualRow = {
  ...accrualA,
  id: "bonus-b",
  amount: 80,
};

describe("history-links", () => {
  it("does not match purchases by promoCode alone", () => {
    const purchases = [issuedA, issuedB];
    assert.equal(findPurchaseByOrderId(purchases, "RC-SAME"), null);
    assert.equal(findPurchaseById(purchases, "RC-SAME"), null);
  });

  it("finds issued purchase only by exact orderId", () => {
    const purchases = [issuedA, issuedB];
    assert.equal(findPurchaseByOrderId(purchases, "ord-a")?.orderId, "ord-a");
    assert.equal(findPurchaseByOrderId(purchases, "ord-unknown"), null);
  });

  it("does not mix two accruals with the same promoCode", () => {
    const purchaseWithBonus: PurchaseRow = { ...issuedA, bonusId: "bonus-a" };
    const accruals = [accrualA, accrualB];
    const linked = findAccrualsForPurchase(purchaseWithBonus, accruals);
    assert.equal(linked.length, 1);
    assert.equal(linked[0]!.id, "bonus-a");
  });

  it("links accrual to purchase only by bonusId", () => {
    const purchases = [acceptedBonus, issuedA];
    assert.equal(findPurchaseForAccrual({ ...accrualA, id: "bonus-1" }, purchases)?.bonusId, "bonus-1");
    assert.equal(findPurchaseForAccrual(accrualA, purchases), null);
  });

  it("returns no accrual links when purchase has no bonusId", () => {
    assert.equal(findAccrualsForPurchase(issuedA, [accrualA, accrualB]).length, 0);
  });

  it("does not treat bonus status row as order match for unknown orderId", () => {
    const purchases = [acceptedBonus, issuedA];
    assert.equal(findPurchaseByOrderId(purchases, "bonus-1"), null);
    assert.equal(findPurchaseById(purchases, "bonus-1")?.source, "accepted-bonus");
  });
});
