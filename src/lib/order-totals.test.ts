import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderItems,
  computeOrderTotals,
  validateOrderAmounts,
} from "./order-totals.ts";

const categories = [
  {
    category: "doors",
    categoryLabel: "Двери",
    discountPercent: 5,
    issuerPercent: 10,
  },
];

describe("order totals", () => {
  it("computes discount and issuer bonus from gross amount", () => {
    const totals = computeOrderTotals(categories, { doors: "1000" });
    assert.equal(totals.totalAmount, 1000);
    assert.equal(totals.totalDiscount, 50);
    assert.equal(totals.totalIssuerBonus, 100);
    assert.equal(totals.payableAmount, 950);
  });

  it("builds order items for positive amounts only", () => {
    const items = buildOrderItems(categories, { doors: "500" });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.amount, 500);
  });

  it("rejects invalid amount draft", () => {
    const result = validateOrderAmounts(categories, { doors: "abc" });
    assert.equal(result.ok, false);
  });

  it("rejects empty purchase", () => {
    const result = validateOrderAmounts(categories, { doors: "" });
    assert.equal(result.ok, false);
  });

  it("sums per-line rounded discounts in whole rubles (not kopeck arithmetic)", () => {
    const multi = [
      { category: "a", categoryLabel: "A", discountPercent: 10, issuerPercent: 0 },
      { category: "b", categoryLabel: "B", discountPercent: 7, issuerPercent: 0 },
      { category: "c", categoryLabel: "C", discountPercent: 10, issuerPercent: 0 },
    ];
    const totals = computeOrderTotals(multi, {
      a: "10750",
      b: "5750",
      c: "906",
    });
    assert.equal(totals.totalAmount, 17406);
    assert.equal(totals.totalDiscount, 1569);
    assert.equal(totals.payableAmount, 15837);
  });
});
