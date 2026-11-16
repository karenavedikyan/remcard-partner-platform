import { describe, expect, it } from "vitest";
import { buildCertificatePolicyDiffRows, certificatePolicyTermsEqual } from "./diff";
import type { CertificatePolicyTerms } from "./types";

const rate = (category: string, label: string, poolPercent: number) => ({ category, categoryLabel: label, poolPercent });
const terms = (categoryRates: CertificatePolicyTerms["categoryRates"]): CertificatePolicyTerms => ({
  validityDays: 14, purchaseLimit: 1, minimumPurchaseAmount: null, promotionsCompatible: false,
  exclusionsText: null, categoryRates,
});
const doors = rate("doors", "Двери", 12);
const flooring = rate("flooring", "Напольные покрытия", 0);
const paint = (p: number) => rate("paint", "Краски", p);

describe("certificate policy diff matches categories by key", () => {
  it("keeps paint7 -> paint8 on paint and never mentions an unrelated door", () => {
    const rows = buildCertificatePolicyDiffRows(terms([paint(7)]), terms([paint(8)]));
    expect(rows).toEqual([{ label: "Краски", current: "7%", next: "8%" }]);
  });

  it("does not cross-wire reordered arrays", () => {
    const a = terms([doors, flooring, paint(7)]);
    const b = terms([paint(7), doors, flooring]);
    expect(buildCertificatePolicyDiffRows(a, b)).toEqual([]);
    expect(certificatePolicyTermsEqual(a, b)).toBe(true);
    const c = terms([paint(8), doors, flooring]);
    expect(buildCertificatePolicyDiffRows(a, c)).toEqual([{ label: "Краски", current: "7%", next: "8%" }]);
  });

  it("reports added and removed keys as absent, not as a change of another category", () => {
    const rows = buildCertificatePolicyDiffRows(terms([paint(7)]), terms([doors, flooring, paint(7)]));
    expect(rows).toEqual([
      { label: "Двери", current: "—", next: "12%" },
      { label: "Напольные покрытия", current: "—", next: "0%" },
    ]);
    const removed = buildCertificatePolicyDiffRows(terms([doors, paint(7)]), terms([paint(7)]));
    expect(removed).toEqual([{ label: "Двери", current: "12%", next: "—" }]);
  });

  it("does not confuse the same percentage under two different keys", () => {
    const rows = buildCertificatePolicyDiffRows(terms([rate("doors", "Двери", 7)]), terms([paint(7)]));
    expect(rows).toEqual([
      { label: "Двери", current: "7%", next: "—" },
      { label: "Краски", current: "—", next: "7%" },
    ]);
    expect(certificatePolicyTermsEqual(terms([rate("doors", "Двери", 7)]), terms([paint(7)]))).toBe(false);
  });

  it("shows Russian labels for raw category codes but keeps custom labels", () => {
    const rows = buildCertificatePolicyDiffRows(
      terms([rate("paint", "paint", 7), rate("custom-x", "Особая линейка", 3)]),
      terms([rate("paint", "paint", 8), rate("custom-x", "Особая линейка", 4)]),
    );
    expect(rows.map((r) => r.label)).toEqual(["Краска / ЛКМ", "Особая линейка"]);
  });

  it("keeps an explicit 0% distinct from an absent category", () => {
    const rows = buildCertificatePolicyDiffRows(terms([flooring]), terms([]));
    expect(rows).toEqual([{ label: "Напольные покрытия", current: "0%", next: "—" }]);
  });
});
