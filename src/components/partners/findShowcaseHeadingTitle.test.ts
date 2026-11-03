import { describe, expect, it } from "vitest";
import { countOpenToCooperatePartners, findShowcaseHeadingTitle } from "./findShowcaseHeadingTitle";
import type { PartnerTaxonomyResponse } from "@/lib/types";

const taxonomy: PartnerTaxonomyResponse = {
  stages: [
    { kind: "stage", id: "L1-8", label: "Чистовая отделка" },
    { kind: "stage", id: "L1-1", label: "Диагностика" },
  ],
  products: [{ kind: "product", id: "doors", label: "Двери" }],
  services: [{ kind: "service", id: "design", label: "Дизайн интерьера" }],
};

describe("findShowcaseHeadingTitle", () => {
  it("defaults when no stage or direction selected", () => {
    expect(findShowcaseHeadingTitle({ stageId: "", specialization: "", taxonomy })).toBe(
      "Найдите своего партнёра",
    );
  });

  it("uses stage label from taxonomy when stage selected", () => {
    expect(
      findShowcaseHeadingTitle({ stageId: "L1-8", specialization: "", taxonomy }),
    ).toBe("Чистовая отделка");
  });

  it("prefers direction label over stage when both set (prototype order)", () => {
    expect(
      findShowcaseHeadingTitle({
        stageId: "L1-8",
        specialization: "products:doors",
        taxonomy,
      }),
    ).toBe("Двери");
  });

  it("falls back to default when taxonomy missing (loading/stale)", () => {
    expect(findShowcaseHeadingTitle({ stageId: "L1-8", specialization: "", taxonomy: null })).toBe(
      "Найдите своего партнёра",
    );
  });

  it("restores default after reset clears stage and direction", () => {
    const afterReset = findShowcaseHeadingTitle({ stageId: "", specialization: "", taxonomy });
    expect(afterReset).toBe("Найдите своего партнёра");
  });
});

describe("countOpenToCooperatePartners", () => {
  it("counts only partners without active/pending relationship", () => {
    expect(
      countOpenToCooperatePartners([
        { partnershipStatus: null },
        { partnershipStatus: "ACTIVE" },
        { partnershipStatus: "ENDED" },
        { partnershipStatus: "PENDING" },
      ]),
    ).toBe(2);
  });
});
