import { describe, expect, it } from "vitest";
import { formatDiscountPercent } from "./formatDiscountPercent";

describe("formatDiscountPercent", () => {
  it("formats integers and one decimal without rounding 5.5 to 6", () => {
    expect(formatDiscountPercent(5)).toBe("5");
    expect(formatDiscountPercent(7)).toBe("7");
    expect(formatDiscountPercent(5.5)).toBe("5.5");
  });

  it("returns em dash when unknown", () => {
    expect(formatDiscountPercent(Number.NaN)).toBe("—");
  });
});
