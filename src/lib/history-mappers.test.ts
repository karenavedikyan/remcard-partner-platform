import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accrualScopeFromWalletRole,
  mapProOrdersToPurchases,
  mapStoreBonusListToPurchases,
  mapStoreOrderDetailToPurchase,
  mapStoreOrdersToPurchases,
  mapWalletTransactionsToAccruals,
} from "./history-mappers.ts";

describe("history mappers", () => {
  it("maps store orders to accepted-order rows with order id and status", () => {
    const rows = mapStoreOrdersToPurchases({
      orders: [
        {
          orderId: "ord-1",
          createdAt: "2026-10-01T10:00:00.000Z",
          status: "CONFIRMED",
          totalAmount: 1000,
          discountAmount: 50,
          payableAmount: 950,
          isSelfScan: false,
          promoCode: "RC-1",
          clientName: "Client",
          proName: "PRO",
          storeName: "Store",
          branchId: null,
          branchName: null,
          branchCity: null,
          executorUserId: "store-1",
          executorName: "Seller",
          proBonus: 100,
          linkedAccruals: [{ id: "bonus-1", type: "bonus" }],
        },
      ],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.source, "accepted-order");
    assert.equal(rows[0]!.orderId, "ord-1");
    assert.equal(rows[0]!.orderStatus, "CONFIRMED");
    assert.equal(rows[0]!.bonusId, "bonus-1");
    assert.equal(rows[0]!.partnerName, "PRO");
  });

  it("maps store order detail with line items", () => {
    const row = mapStoreOrderDetailToPurchase({
      order: {
        orderId: "ord-2",
        createdAt: "2026-10-02T10:00:00.000Z",
        status: "CONFIRMED",
        totalAmount: 500,
        discountAmount: 25,
        payableAmount: 475,
        isSelfScan: true,
        promoCode: "RC-2",
        clientName: null,
        proName: "PRO",
        storeName: "Store",
        branchId: null,
        branchName: null,
        branchCity: null,
        executorUserId: "store-1",
        executorName: null,
        proBonus: 0,
        linkedAccruals: [],
        items: [
          {
            id: "item-1",
            category: "doors",
            categoryLabel: "Двери",
            amount: 500,
            discountPercent: 5,
            discountAmount: 25,
            issuerPercent: 0,
            issuerAmount: 0,
          },
        ],
      },
    });
    assert.equal(row.isSelfScan, true);
    assert.equal(row.items.length, 1);
    assert.equal(row.bonusId, null);
  });

  it("maps store bonus list to accepted-bonus rows preserving optional orderId", () => {
    const rows = mapStoreBonusListToPurchases({
      totalPaid: 0,
      totalPending: 100,
      bonuses: [
        {
          id: "bonus-1",
          orderId: "ord-legacy",
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
    assert.equal(rows[0]!.source, "accepted-bonus");
    assert.equal(rows[0]!.orderId, "ord-legacy");
  });

  it("maps pro orders to issued-order rows", () => {
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
    assert.equal(rows[0]!.source, "issued-order");
    assert.equal(rows[0]!.orderId, "ord-9");
  });

  it("maps wallet scope from server role", () => {
    assert.equal(accrualScopeFromWalletRole("MASTER"), "earned");
    assert.equal(accrualScopeFromWalletRole("STORE"), "payable-to-pros");
    assert.equal(accrualScopeFromWalletRole(null), "unknown");
  });

  it("excludes self-scan accruals and attaches wallet role", () => {
    const rows = mapWalletTransactionsToAccruals(
      {
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
      },
      "MASTER",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.scope, "earned");
  });
});
