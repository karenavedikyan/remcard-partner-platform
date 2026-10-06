import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accrualScopeFromWalletRole,
  mapProOrderDetailToPurchase,
  mapStoreBonusListToPurchases,
  mapStoreOrdersToPurchases,
  mapWalletTransactionsToAccruals,
} from "./history-mappers.ts";

describe("history mappers", () => {
  it("maps store orders with typed bonus links", () => {
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
    assert.equal(rows[0]!.linkedAccruals.length, 1);
    assert.equal(rows[0]!.linkedAccruals[0]!.type, "bonus");
    assert.equal(rows[0]!.bonusId, "bonus-1");
  });

  it("maps pro order detail preserving agentBonus links", () => {
    const row = mapProOrderDetailToPurchase({
      order: {
        orderId: "ord-agent",
        createdAt: "2026-10-02T10:00:00.000Z",
        status: "CONFIRMED",
        totalAmount: 500,
        discountAmount: 25,
        payableAmount: 475,
        isSelfScan: false,
        promoCode: "RC-A",
        clientName: "Client",
        storeName: "Shop",
        branchId: null,
        branchName: null,
        branchCity: null,
        proBonus: 50,
        linkedAccruals: [
          { id: "bonus-1", type: "bonus" },
          { id: "agent-1", type: "agentBonus" },
        ],
        items: [],
      },
    });
    assert.equal(row.linkedAccruals.length, 2);
    assert.equal(row.linkedAccruals.some((link) => link.type === "agentBonus"), true);
    assert.equal(row.bonusId, "bonus-1");
  });

  it("maps wallet transactions with orderId and accrualType", () => {
    const rows = mapWalletTransactionsToAccruals(
      {
        transactions: [
          {
            id: "agent-1",
            orderId: "ord-9",
            accrualType: "agentBonus",
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
      "AGENT",
    );
    assert.equal(rows[0]!.orderId, "ord-9");
    assert.equal(rows[0]!.accrualType, "agentBonus");
  });

  it("maps store bonus list preserving optional orderId", () => {
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
    assert.equal(rows[0]!.orderId, "ord-legacy");
    assert.equal(rows[0]!.linkedAccruals[0]!.type, "bonus");
  });

  it("maps wallet scope from server role", () => {
    assert.equal(accrualScopeFromWalletRole("MASTER"), "earned");
    assert.equal(accrualScopeFromWalletRole("STORE"), "payable-to-pros");
  });
});
