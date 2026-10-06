import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_HISTORY_FILTERS, filterAccruals, filterPurchases } from "./history-filters.ts";
import type { AccrualRow, PurchaseRow } from "./history-types.ts";

const purchase: PurchaseRow = {
  id: "b1",
  orderId: "ord-1",
  bonusId: "b1",
  createdAt: "2026-10-01T12:00:00.000Z",
  promoCode: "RC-ABC",
  partnerName: "Store",
  direction: "accepted",
  totalAmount: 1000,
  discountAmount: 50,
  payableAmount: 950,
  orderStatus: "CONFIRMED",
  bonusStatus: "CALCULATED",
  isSelfScan: false,
  clientName: "Client",
  branchName: null,
  proBonus: 100,
  items: [],
};

describe("filterPurchases", () => {
  it("filters by search on promo code and order id", () => {
    const byPromo = filterPurchases([purchase], {
      ...DEFAULT_HISTORY_FILTERS,
      search: "RC-ABC",
    });
    assert.equal(byPromo.length, 1);

    const byOrder = filterPurchases([purchase], {
      ...DEFAULT_HISTORY_FILTERS,
      search: "ord-1",
    });
    assert.equal(byOrder.length, 1);

    const miss = filterPurchases([purchase], {
      ...DEFAULT_HISTORY_FILTERS,
      search: "missing",
    });
    assert.equal(miss.length, 0);
  });

  it("filters by direction and status", () => {
    const issued = { ...purchase, direction: "issued" as const };
    const onlyAccepted = filterPurchases([purchase, issued], {
      ...DEFAULT_HISTORY_FILTERS,
      direction: "accepted",
    });
    assert.equal(onlyAccepted.length, 1);

    const byBonusStatus = filterPurchases([purchase], {
      ...DEFAULT_HISTORY_FILTERS,
      status: "CALCULATED",
    });
    assert.equal(byBonusStatus.length, 1);
  });
});

describe("filterAccruals", () => {
  const accrual: AccrualRow = {
    id: "a1",
    createdAt: "2026-10-01T12:00:00.000Z",
    amount: 100,
    status: "CALCULATED",
    paidAt: null,
    counterpartyName: "Store",
    promoCode: "RC-ABC",
    isSelfScan: false,
    orderId: null,
    items: [],
  };

  it("filters accruals by status and search", () => {
    const filtered = filterAccruals([accrual], {
      ...DEFAULT_HISTORY_FILTERS,
      status: "CALCULATED",
      search: "RC-ABC",
    });
    assert.equal(filtered.length, 1);
  });
});
