import { describe, expect, it } from "vitest";
import {
  issuedRecipientPolicies,
  legacyRecipientPolicyFromCertificate,
} from "./certificate-recipient-display";
import type { StoreCertificate } from "@/lib/certificate-types";

describe("issuedRecipientPolicies", () => {
  it("uses frozen server snapshot, not cert validUntil recompute", () => {
    const cert: StoreCertificate = {
      id: "1",
      promoCode: "X",
      qrCode: "q",
      status: "ACTIVE",
      validUntil: "2027-01-01T00:00:00.000Z",
      maxUsages: 0,
      usageCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      partners: [
        {
          id: "p",
          storeUserId: "s",
          storeName: "Store",
          partnershipId: null,
          isSelfScan: false,
          categories: [],
          recipientPolicy: {
            validityDays: 30,
            purchaseLimit: 2,
            minimumPurchaseAmount: null,
            promotionsCompatible: false,
            exclusionsText: null,
            policySource: "general",
            validUntil: "2026-01-30T20:59:59.999Z",
            consumedUses: 1,
            remainingPurchases: 1,
          },
        },
      ],
    };
    const rows = issuedRecipientPolicies(cert);
    expect(rows[0]!.policy.validUntil).toBe("2026-01-30T20:59:59.999Z");
    expect(rows[0]!.policy.legacyFallback).toBe(false);
    expect(rows[0]!.policy.remainingPurchases).toBe(1);
  });
});

describe("legacyRecipientPolicyFromCertificate", () => {
  const partner = {
    id: "p",
    storeUserId: "s",
    storeName: "Store",
    partnershipId: null,
    isSelfScan: false,
    categories: [],
  };

  it("preserves unlimited legacy when maxUsages <= 0", () => {
    const cert: StoreCertificate = {
      id: "1",
      promoCode: "X",
      qrCode: "q",
      status: "ACTIVE",
      validUntil: "2027-06-01T00:00:00.000Z",
      maxUsages: 0,
      usageCount: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      partners: [partner],
    };
    const legacy = legacyRecipientPolicyFromCertificate(cert, partner);
    expect(legacy?.purchaseLimit).toBeNull();
    expect(legacy?.remainingPurchases).toBeNull();
    expect(legacy?.validityDays).toBeNull();
    expect(legacy?.promotionsCompatible).toBeNull();
    expect(legacy?.policySource).toBe("legacy");
    expect(legacy?.validUntil).toBe(cert.validUntil);
  });

  it("uses finite cert maxUsages without inventing receiving-policy fields", () => {
    const cert: StoreCertificate = {
      id: "1",
      promoCode: "X",
      qrCode: "q",
      status: "ACTIVE",
      validUntil: "2027-06-01T00:00:00.000Z",
      maxUsages: 5,
      usageCount: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      partners: [partner],
    };
    const legacy = legacyRecipientPolicyFromCertificate(cert, partner);
    expect(legacy?.purchaseLimit).toBe(5);
    expect(legacy?.remainingPurchases).toBe(3);
    expect(legacy?.validityDays).toBeNull();
    expect(legacy?.promotionsCompatible).toBeNull();
  });
});