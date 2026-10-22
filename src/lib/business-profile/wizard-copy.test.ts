import { describe, expect, it } from "vitest";
import { businessWizardCopy } from "./wizard-copy";

describe("businessWizardCopy", () => {
  it("uses store step labels from prototype", () => {
    expect(businessWizardCopy("STORE").steps).toEqual([
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
