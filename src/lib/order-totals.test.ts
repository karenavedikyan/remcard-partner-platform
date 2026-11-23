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

  it("ignores discount draft when line amount is empty", () => {
    const result = validateOrderDiscountDrafts([doors], { doors: "" }, { doors: "101" });
    expect(result.ok).toBe(true);
  });

  it("rejects discount above category pool", () => {
    const result = validateOrderDiscountDrafts([doors], { doors: "10000" }, { doors: "10.02" });
    expect(result.ok).toBe(false);
  });

  it("uses maxClientDiscountPercent 20 when frozen line shows 10+5", () => {
    const cat: PreviewCategory = {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 10,
      issuerPercent: 10,
      maxClientDiscountPercent: 20,
    };
    const ok = validateOrderDiscountDrafts([cat], { doors: "10000" }, { doors: "20" });
    expect(ok.ok).toBe(true);
    const bad = validateOrderDiscountDrafts([cat], { doors: "10000" }, { doors: "20.01" });
    expect(bad.ok).toBe(false);
  });

  it("blocks submit when offered exceeds live max without explicit edit", () => {
    const cat: PreviewCategory = {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 10,
      issuerPercent: 2,
      maxClientDiscountPercent: 8,
    };
    const result = validateOrderDiscountDrafts([cat], { doors: "10000" });
    expect(result.ok).toBe(false);
  });

  it("live max 12 accepts 12 rejects 12.01", () => {
    const cat: PreviewCategory = {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 10,
      issuerPercent: 2,
      maxClientDiscountPercent: 12,
    };
    expect(validateOrderDiscountDrafts([cat], { doors: "1" }, { doors: "12" }).ok).toBe(true);
    expect(validateOrderDiscountDrafts([cat], { doors: "1" }, { doors: "12.01" }).ok).toBe(false);
  });
});