import { describe, expect, it } from "vitest";
import { businessWizardCopy } from "./wizard-copy";

describe("businessWizardCopy", () => {
  it("uses prototype journey title and basics heading for store", () => {
    const copy = businessWizardCopy("STORE");
    expect(copy.journeyTitle).toBe("Профиль без лишнего");
    expect(copy.basicsStepTitle).toBe("Представьте ваш магазин");
    expect(copy.steps).toEqual([
      "О магазине",
      "Ассортимент",
      "Связь и работа",
      "Проверка",
    ]);
  });

  it("uses company step labels from prototype", () => {
    expect(businessWizardCopy("COMPANY").steps).toEqual([
      "О компании",
      "Направления",
      "Связь и работа",
      "Проверка",
    ]);
  });
});
