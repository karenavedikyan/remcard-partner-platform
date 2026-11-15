import { describe, expect, it } from "vitest";
import {
  buildOrderItems,
  computeOrderTotals,
  lineDiscountRub,
  validateOrderDiscountDrafts,
} from "./order-totals";
import type { PreviewCategory } from "@/lib/order-types";

const doors: PreviewCategory = {
  category: "doors",
  categoryLabel: "Двери",
  discountPercent: 7,
  issuerPercent: 3,
};

describe("order-totals flexible client discount", () => {
  it("applies chosen 6% on 10000 gross (offer 7%) for summary and line", () => {
    const totals = computeOrderTotals([doors], { doors: "10000" }, { doors: "6" });
    expect(totals.totalDiscount).toBe(600);
    expect(totals.payableAmount).toBe(9400);
    expect(lineDiscountRub(10000, 6)).toBe(600);

    const items = buildOrderItems([doors], { doors: "10000" }, { doors: "6" });
    expect(items[0]?.discountPercent).toBe(6);
  });

  it("blocks invalid discount before review (101%) even with active amount", () => {
    const result = validateOrderDiscountDrafts([doors], { doors: "10000" }, { doors: "101" });
    expect(result.ok).toBe(false);
  });

  it("blocks invalid discount on empty amount line", () => {
    const result = validateOrderDiscountDrafts([doors], { doors: "" }, { doors: "101" });
    expect(result.ok).toBe(false);
  });
});