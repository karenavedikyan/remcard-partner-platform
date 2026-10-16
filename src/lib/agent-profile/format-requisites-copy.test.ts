import { describe, expect, it } from "vitest";
import {
  formatRequisitesCopyText,
  hasFullRequisitesForCopy,
} from "./format-requisites-copy";
import type { AgentRequisitesItem } from "./types";

const fullItem: AgentRequisitesItem = {
  id: "x",
  kind: "company",
  label: "Личный счёт",
  legalName: "ООО Тест",
  inn: "7707083893",
  kpp: "770701001",
  bankName: "Тест Банк",
  bik: "044525225",
  accountNumber: "40702810900000000001",
  accountNumberMasked: "****0001",
  corrAccount: "30101810400000000225",
  corrAccountMasked: "****0225",
  isPrimary: true,
  applyForNextPayout: false,
  isArchived: false,
  version: 1,
};

describe("formatRequisitesCopyText", () => {
  it("includes label, legalName, KPP and full accounts", () => {
    const text = formatRequisitesCopyText(fullItem);
    expect(text).toContain("Название: Личный счёт");
    expect(text).toContain("ООО Тест");
    expect(text).toContain("КПП 770701001");
    expect(text).toContain("40702810900000000001");
    expect(text).not.toContain("****0001");
  });

  it("requires full account digits for copy readiness", () => {
    expect(hasFullRequisitesForCopy(fullItem)).toBe(true);
    expect(
      hasFullRequisitesForCopy({ ...fullItem, accountNumber: undefined, accountNumberMasked: "****" }),
    ).toBe(false);
  });
});
