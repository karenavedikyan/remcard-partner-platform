import { describe, expect, it } from "vitest";
import { buildBranchPreviewModel } from "@/lib/branch-catalog-preview";
import { emptyBranchContactsForm } from "@/lib/branch-public-contacts";

describe("buildBranchPreviewModel", () => {
  it("includes effective branch fields only", () => {
    const contacts = emptyBranchContactsForm();
    contacts.phone = { isActive: true, value: "+79001234567" };
    const model = buildBranchPreviewModel({
      name: "Центр",
      city: "Краснодар",
      address: "ул. Тест",
      description: "Desc",
      workingHours: "пн 09:00–18:00",
      storeCategories: ["doors"],
      specializations: ["tiles"],
      photoUrl: "",
      contacts,
    });
    expect(model.title).toBe("Центр");
    expect(model.productLabels.length).toBeGreaterThan(0);
    expect(model.contactLines.some((l) => l.includes("phone"))).toBe(true);
  });
});
