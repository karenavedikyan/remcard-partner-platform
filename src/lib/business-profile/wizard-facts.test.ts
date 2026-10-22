import { describe, expect, it } from "vitest";
import {
  buildBusinessDirectionLabelMap,
  businessWorkingProfileFactRows,
} from "./wizard-facts";
import { businessWizardCopy } from "./wizard-copy";
import type { ProfileDraft } from "@/lib/profile-save";

function draft(partial: Partial<ProfileDraft>): ProfileDraft {
  return {
    displayName: "Rep",
    city: "Krasnodar",
    organizationName: "Org",
    partnerType: "COMPANY",
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: [],
    primaryDirection: null,
    areas: [],
    website: "",
    telegram: "",
    partnershipContactName: "",
    partnershipContactPhone: "",
    partnershipContactEmail: "",
    partnerWorkMode: "",
    specializations: [],
    storeCategories: [],
    ...partial,
  } as ProfileDraft;
}

describe("businessWorkingProfileFactRows", () => {
  it("includes optional business fields when set", () => {
    const copy = businessWizardCopy("COMPANY");
    const rows = businessWorkingProfileFactRows(
      draft({
        website: "example.ru",
        telegram: "@shop",
        partnershipContactName: "Мария",
        partnerWorkMode: "BOTH",
        areas: ["Krasnodar"],
      }),
      copy,
      { areasText: "Krasnodar, Anapa" },
    );
    const terms = rows.map((r) => r.term);
    expect(terms).toContain("Сайт");
    expect(terms).toContain("Telegram");
    expect(terms).toContain("Контактное лицо");
    expect(terms).toContain("Формат работы");
    expect(terms).toContain("Территория работы");
    expect(rows.find((r) => r.term === "Контактное лицо")?.value).toBe("Мария");
  });
});

describe("buildBusinessDirectionLabelMap", () => {
  it("maps taxonomy ids to chip labels", () => {
    const map = buildBusinessDirectionLabelMap({
      products: [{ kind: "product", id: "doors", label: "Двери" }],
    });
    expect(map.get("product:doors")).toBe("Товар: Двери");
  });
});
