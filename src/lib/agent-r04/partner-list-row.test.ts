import { describe, expect, it } from "vitest";
import { partnerListDetail, partnerListSubtitle, partnerSpecializationHint } from "./partner-list-row";
import type { Partnership } from "@/lib/types";

describe("partner-list-row labels", () => {
  it("renders Russian specialization labels instead of raw ids", () => {
    const hint = partnerSpecializationHint({
      id: "p1",
      displayName: "X",
      storeCategories: ["doors", "flooring"],
      specializations: [],
    } as never);
    expect(hint).toContain("Двери");
    expect(hint).not.toContain("doors");
  });

  it("uses company type in subtitle", () => {
    const line = partnerListSubtitle({
      id: "p2",
      displayName: "Мастерская",
      partnerType: "COMPANY",
      city: "Краснодар",
      specializations: ["painting"],
      workingServiceSpecializationIds: ["painting"],
    } as never);
    expect(line).toContain("Компания");
    expect(line).toContain("Краснодар");
  });

  it("keeps detail column about city and specs", () => {
    const partnership = {
      id: "ps",
      storeUserId: "store",
      proUserId: "agent",
      storeUser: {
        id: "store",
        displayName: "Дом материалов",
        partnerType: "STORE",
        city: "Краснодар",
        storeCategories: ["doors"],
      },
      proUser: { id: "agent", displayName: "Agent" },
      terms: [{ id: "t1", category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    } as Partnership;
    const detail = partnerListDetail(partnership, "agent");
    expect(detail).toMatch(/Краснодар/);
    expect(detail).toMatch(/Двери/);
  });
});
