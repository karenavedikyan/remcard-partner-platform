import { describe, expect, it } from "vitest";
import { formatFindShowcaseCountLine, formatFindShowcasePartnerTotal, russianPlural } from "./findShowcaseCountLine";

describe("findShowcaseCountLine", () => {
  it("pluralizes partner totals", () => {
    expect(formatFindShowcasePartnerTotal(1)).toBe("1 партнёр");
    expect(formatFindShowcasePartnerTotal(2)).toBe("2 партнёра");
    expect(formatFindShowcasePartnerTotal(5)).toBe("5 партнёров");
  });

  it("pluralizes full line when open aggregate is known", () => {
    expect(formatFindShowcaseCountLine(1, 1)).toBe("1 партнёр · 1 открыт к сотрудничеству");
    expect(formatFindShowcaseCountLine(2, 2)).toBe("2 партнёра · 2 открыты к сотрудничеству");
    expect(formatFindShowcaseCountLine(5, 5)).toBe("5 партнёров · 5 открыты к сотрудничеству");
  });

  it("supports category plural helper", () => {
    expect(russianPlural(3, "категория", "категории", "категорий")).toBe("категории");
  });
});
