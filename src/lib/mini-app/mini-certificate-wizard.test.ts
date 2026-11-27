import { describe, expect, it } from "vitest";
import type { AvailablePartner } from "@/lib/certificate-types";
import {
  filterSelectablePartners,
  miniCertificateUsesWizard,
} from "@/lib/mini-app/mini-certificate-wizard";

function partner(id: string, categories: AvailablePartner["categories"]): AvailablePartner {
  return {
    partnershipId: `p-${id}`,
    storeUserId: `store-${id}`,
    storeName: id,
    city: null,
    isSelfScan: false,
    programReady: true,
    categories,
  };
}

describe("miniCertificateUsesWizard", () => {
  it("enables wizard for specialist and agent regardless of partner count", () => {
    const one = [partner("a", [{ category: "doors", categoryLabel: "Двери", poolPercent: 5, discountPercent: 2, issuerPercent: 3 }])];
    expect(miniCertificateUsesWizard("specialist", filterSelectablePartners(one))).toBe(true);
    expect(miniCertificateUsesWizard("agent", filterSelectablePartners(one))).toBe(true);
  });

  it("uses wizard for store with multiple partners", () => {
    const rows = [
      partner("a", [{ category: "doors", categoryLabel: "Двери", poolPercent: 5, discountPercent: 2, issuerPercent: 3 }]),
      partner("b", [{ category: "win", categoryLabel: "Окна", poolPercent: 5, discountPercent: 2, issuerPercent: 3 }]),
    ];
    expect(miniCertificateUsesWizard("store", filterSelectablePartners(rows))).toBe(true);
  });

  it("skips wizard for store with one partner and one category", () => {
    const rows = [
      partner("a", [{ category: "doors", categoryLabel: "Двери", poolPercent: 5, discountPercent: 2, issuerPercent: 3 }]),
    ];
    expect(miniCertificateUsesWizard("store", filterSelectablePartners(rows))).toBe(false);
  });
});