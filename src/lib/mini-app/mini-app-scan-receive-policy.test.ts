import { describe, expect, it } from "vitest";
import {
  buildOrderItems,
  commitDiscountDraftOnBlur,
  discountDraftInputValue,
  validateCategoryDiscountField,
  validateOrderDiscountDrafts,
} from "@/lib/order-totals";
import type { PreviewCategory } from "@/lib/order-types";

const cats: PreviewCategory[] = [
  { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
  { category: "floor", categoryLabel: "Пол", discountPercent: 7, issuerPercent: 3 },
];

describe("mini-app scan purchase discount boundaries", () => {
  it("allows pool-equal client discount on active lines", () => {
    expect(validateOrderDiscountDrafts(cats, { doors: "120000" }, { doors: "15" }).ok).toBe(true);
  });

  it("rejects 15.01% when pool is 15%", () => {
    const result = validateOrderDiscountDrafts(cats, { doors: "120000" }, { doors: "15.01" });
    expect(result.ok).toBe(false);
  });

  it("validates multiple categories independently", () => {
    const result = validateOrderDiscountDrafts(
      cats,
      { doors: "10000", floor: "5000" },
      { doors: "10", floor: "10.1" },
    );
    expect(result.ok).toBe(false);
  });

  it("unset discount reverts display to certificate and sends no override", () => {
    expect(discountDraftInputValue(cats[0]!, {})).toBe("10");
    expect(commitDiscountDraftOnBlur("doors", "")).toEqual({ action: "unset" });
    const items = buildOrderItems(cats, { doors: "10000" }, {});
    expect(items[0]?.discountPercent).toBeUndefined();
  });

  it("per-field validator flags negative and pool overflow", () => {
    expect(validateCategoryDiscountField(cats[0]!, { doors: "100" }, { doors: "-1" }).ok).toBe(false);
    expect(validateCategoryDiscountField(cats[0]!, { doors: "100" }, { doors: "15.01" }).ok).toBe(false);
    expect(validateCategoryDiscountField(cats[0]!, { doors: "100" }, { doors: "15" }).ok).toBe(true);
  });
});