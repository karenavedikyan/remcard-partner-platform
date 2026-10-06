import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAccrualsForPurchase,
  findAccrualById,
  findPurchaseById,
  findPurchaseByOrderHint,
  mapProOrdersToPurchases,
  mapStoreBonusListToPurchases,
  mapWalletTransactionsToAccruals,
} from "./history-mappers.ts";
import type { AccrualRow, PurchaseRow } from "./history-types.ts";

describe("history mappers", () => {
  it("maps store bonus list to accepted purchases", () => {
    const rows = mapStoreBonusListToPurchases({
      totalPaid: 0,
      totalPending: 100,
      bonuses: [
        {
          id: "bonus-1",
          amount: 100,
          status: "CALCULATED",
          paidAt: null,
          payoutMethod: null,
          createdAt: "2026-10-01T10:00:00.000Z",
          proName: "PRO",
          clientName: "Client",
          totalAmount: 1000,
          discountAmount: 50,
          promoCode: "RC-1",
          certificatePartner: { storeName: "Store", isSelfScan: false },
          orderItems: [{ categoryLabel: "Двери", amount: 1000, issuerPercent: 10, issuerAmount: 100 }],
        },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.direction, "accepted");
    assert.equal(rows[0]!.payableAmount, 950);
    assert.equal(rows[0]!.items[0]!.categoryLabel, "Двери");
  });

  it("maps pro orders to issued purchases", () => {
    const rows = mapProOrdersToPurchases({
      orders: [
        {
          id: "ord-9",
          createdAt: "2026-10-02T10:00:00.000Z",
          clientName: "Client",
          totalAmount: 500,
          discountAmount: 25,
          proBonus: 50,
          status: "CONFIRMED",
          storeName: "Shop",
          branchName: "Branch",
          promoCode: "RC-9",
        },
      ],
    });
    assert.equal(rows[0]!.direction, "issued");
    assert.equal(rows[0]!.orderId, "ord-9");
  });

  it("excludes self-scan accruals", () => {
    const rows = mapWalletTransactionsToAccruals({
      transactions: [
        {
          id: "tx-1",
          amount: 0,
          status: "CALCULATED",
          createdAt: "2026-10-01T10:00:00.000Z",
          paidAt: null,
          payoutMethod: null,
          counterpartyName: "Self",
          promoCode: "RC-SS",
          isSelfScan: true,
          items: [],
        },
        {
          id: "tx-2",
          amount: 80,
          status: "CALCULATED",
          createdAt: "2026-10-01T11:00:00.000Z",
          paidAt: null,
          payoutMethod: null,
          counterpartyName: "Store",
          promoCode: "RC-2",
          isSelfScan: false,
          items: [],
        },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, "tx-2");
  });

  it("finds purchase by order id or promo code hint", () => {
    const rows = mapProOrdersToPurchases({
      orders: [
        {
          id: "ord-42",
          createdAt: "2026-10-02T10:00:00.000Z",
          clientName: "Client",
          totalAmount: 500,
          discountAmount: 25,
          proBonus: 50,
          status: "CONFIRMED",
          storeName: "Shop",
          branchName: null,
          promoCode: "RC-42",
        },
      ],
    });
    assert.equal(findPurchaseByOrderHint(rows, { orderId: "ord-42" })?.id, "ord-42");
    assert.equal(findPurchaseByOrderHint(rows, { promoCode: "RC-42" })?.promoCode, "RC-42");
  });

  it("finds purchase by id or order id", () => {
    const rows = mapProOrdersToPurchases({
      orders: [
        {
          id: "ord-7",
          createdAt: "2026-10-02T10:00:00.000Z",
          clientName: "Client",
          totalAmount: 500,
          discountAmount: 25,
          proBonus: 50,
          status: "CONFIRMED",
          storeName: "Shop",
          branchName: null,
          promoCode: "RC-7",
        },
      ],
    });
    assert.equal(findPurchaseById(rows, "ord-7")?.id, "ord-7");
  });

  it("links accruals to purchase by promo or bonus id", () => {
    const purchase: PurchaseRow = {
      id: "bonus-1",
      orderId: null,
      bonusId: "bonus-1",
      createdAt: "2026-10-01T12:00:00.000Z",
      promoCode: "RC-LINK",
      partnerName: "Store",
      direction: "accepted",
      totalAmount: 1000,
      discountAmount: 50,
      payableAmount: 950,
      orderStatus: null,
      bonusStatus: "CALCULATED",
      isSelfScan: false,
      clientName: "Client",
      branchName: null,
      proBonus: 100,
      items: [],
    };
    const accruals: AccrualRow[] = [
      {
        id: "bonus-1",
        createdAt: "2026-10-01T12:00:00.000Z",
        amount: 100,
        status: "CALCULATED",
        paidAt: null,
        counterpartyName: "Store",
        promoCode: "RC-LINK",
        isSelfScan: false,
        orderId: null,
        items: [],
      },
    ];
    assert.equal(findAccrualsForPurchase(purchase, accruals).length, 1);
    assert.equal(findAccrualById(accruals, "bonus-1")?.amount, 100);
    assert.equal(findAccrualsForPurchase({ ...purchase, isSelfScan: true }, accruals).length, 0);
  });
});
