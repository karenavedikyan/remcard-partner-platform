import { describe, expect, it } from "vitest";
import { buildCertificatePolicyDiffRows, certificatePolicyTermsEqual } from "./diff";
import { certificatePolicyExpiryIso } from "./expiry";
import { emptyCertificatePolicyTerms } from "./defaults";
import {
  parseCertificatePolicyTermsInput,
  rejectNoOpIndividualProposal,
} from "./validate";

const base = emptyCertificatePolicyTerms([
  { category: "doors", categoryLabel: "Двери", poolPercent: 15 },
  { category: "floor", categoryLabel: "Напольные покрытия", poolPercent: 13 },
]);

describe("certificate policy validation", () => {
  it("rejects no-op individual proposals", () => {
    expect(rejectNoOpIndividualProposal(base, { ...base })).toMatch(/Нет отличий/);
  });

  it("accepts changed purchase limit", () => {
    const next = { ...base, purchaseLimit: 3 };
    expect(rejectNoOpIndividualProposal(base, next)).toBeNull();
    const parsed = parseCertificatePolicyTermsInput(next, base);
    expect(parsed.ok).toBe(true);
  });

  it("rejects opaque pool outside bounds", () => {
    const next = {
      ...base,
      categoryRates: [{ ...base.categoryRates[0], poolPercent: 100.05 }],
    };
    expect(parseCertificatePolicyTermsInput(next, base).ok).toBe(false);
  });
});

describe("certificate policy diff", () => {
  it("lists only changed rows", () => {
    const rows = buildCertificatePolicyDiffRows(base, {
      ...base,
      validityDays: 45,
      purchaseLimit: 2,
    });
    expect(rows.map((r) => r.label)).toEqual(["Срок", "Покупок"]);
    expect(certificatePolicyTermsEqual(base, base)).toBe(true);
  });
});

describe("certificate policy Moscow expiry", () => {
  it("counts issue day as day 1", () => {
    const iso = certificatePolicyExpiryIso(30, new Date("2026-01-01T12:00:00.000Z"));
    expect(iso).toMatch(/T20:59:59\.999Z$/);
  });
});