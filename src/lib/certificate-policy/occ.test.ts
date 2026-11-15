import { describe, expect, it } from "vitest";
import {
  certificatePolicyCategoryRatesFingerprint,
  certificatePolicyIndividualOcc,
  certificatePolicyProposalOcc,
  formatPoolPercentForFingerprint,
} from "./occ";

describe("certificate policy OCC helpers", () => {
  it("fingerprint preserves distinct sub-tenth rates", () => {
    const a = certificatePolicyCategoryRatesFingerprint([
      { category: "doors", categoryLabel: "Двери", poolPercent: 15.01 },
    ]);
    const b = certificatePolicyCategoryRatesFingerprint([
      { category: "doors", categoryLabel: "Двери", poolPercent: 15.04 },
    ]);
    expect(a).not.toBe(b);
    expect(formatPoolPercentForFingerprint(15.01)).toBe("15.01");
  });

  it("fingerprint is order-stable", () => {
    const a = certificatePolicyCategoryRatesFingerprint([
      { category: "floor", categoryLabel: "Пол", poolPercent: 10 },
      { category: "doors", categoryLabel: "Двери", poolPercent: 15.5 },
    ]);
    const b = certificatePolicyCategoryRatesFingerprint([
      { category: "doors", categoryLabel: "Двери", poolPercent: 15.5 },
      { category: "floor", categoryLabel: "Пол", poolPercent: 10 },
    ]);
    expect(a).toBe(b);
    expect(a).toBe("doors:15.5|floor:10");
  });

  it("individual OCC carries counterparty pool revision", () => {
    expect(
      certificatePolicyIndividualOcc({
        generalVersion: 2,
        individualVersion: 5,
        categoryRatesRevision: "doors:15.0",
        counterpartyCategoryRatesRevision: "cp-doors:12.25",
      }),
    ).toEqual({
      expectedVersion: 2,
      expectedIndividualVersion: 5,
      categoryRatesRevision: "doors:15.0",
      counterpartyCategoryRatesRevision: "cp-doors:12.25",
    });
  });

  it("proposal OCC uses proposal row version", () => {
    expect(
      certificatePolicyProposalOcc({ proposalId: "abc", proposalVersion: 9 }),
    ).toEqual({ proposalId: "abc", expectedProposalVersion: 9 });
  });
});