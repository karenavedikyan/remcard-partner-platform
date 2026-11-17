import { describe, expect, it } from "vitest";
import { specialistSpecializationSummary } from "./display-labels";

describe("specialistSpecializationSummary (M5.2)", () => {
  it("is empty (row omitted) when neither role nor services are chosen — never a dash", () => {
    expect(specialistSpecializationSummary({})).toBe("");
    expect(specialistSpecializationSummary({ serviceSpecializationIds: [] })).toBe("");
    expect(specialistSpecializationSummary({ specialistKind: undefined, specialistTitle: "  " })).toBe("");
  });

  it("falls back to the same services the chips show", () => {
    expect(specialistSpecializationSummary({ serviceSpecializationIds: ["doors"] })).toBe("Двери");
    expect(specialistSpecializationSummary({ serviceSpecializationIds: ["doors", "tiles"] })).toBe(
      "Двери, Плитка",
    );
  });

  it("prefers the chosen role / own title", () => {
    expect(
      specialistSpecializationSummary({
        specialistKind: "other",
        specialistTitle: "Мастер по дверям",
        serviceSpecializationIds: ["doors"],
      }),
    ).toBe("Мастер по дверям");
  });
});
