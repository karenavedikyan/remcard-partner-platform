import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildIssuedCertificatePreview, recipientPolicyRowState } from "./certificate-issued-preview";
import { issuedRecipientPolicies } from "./certificate-recipient-display";
import { deriveStoreCertCardState } from "@/lib/storeCertificateClientCardModel";
import type { StoreCertificate } from "@/lib/certificate-types";

const partnerBase = {
  id: "p",
  partnershipId: "ps",
  isSelfScan: false,
  categories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 10 }],
};

function cert(partners: StoreCertificate["partners"]): StoreCertificate {
  return {
    id: "c1",
    promoCode: "RC-1",
    qrCode: "qr",
    status: "EXPIRED",
    validUntil: "2020-01-01T00:00:00.000Z",
    maxUsages: 1,
    usageCount: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    partners,
  };
}

describe("buildIssuedCertificatePreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps legacy card model when no recipient snapshots", () => {
    const c = cert([
      {
        ...partnerBase,
        storeUserId: "s1",
        storeName: "Store",
      },
    ]);
    const preview = buildIssuedCertificatePreview(c, "RC-1", "https://x/c");
    expect(preview.kind).toBe("legacy");
    expect(deriveStoreCertCardState(c)).toBe("expired");
    if (preview.kind === "legacy") {
      expect(preview.model.active).toBe(false);
    }
  });

  it("stays active when partner B valid while global cert is expired (partner A expired)", () => {
    const c = cert([
      {
        ...partnerBase,
        storeUserId: "a",
        storeName: "Partner A",
        recipientPolicy: {
          validityDays: 30,
          purchaseLimit: 1,
          minimumPurchaseAmount: null,
          promotionsCompatible: false,
          exclusionsText: null,
          policySource: "general",
          validUntil: "2026-01-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 1,
        },
      },
      {
        ...partnerBase,
        storeUserId: "b",
        storeName: "Partner B",
        recipientPolicy: {
          validityDays: 45,
          purchaseLimit: 2,
          minimumPurchaseAmount: null,
          promotionsCompatible: true,
          exclusionsText: null,
          policySource: "individual",
          validUntil: "2026-12-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 2,
        },
      },
    ]);
    const rows = issuedRecipientPolicies(c);
    expect(recipientPolicyRowState(rows[0]!.policy)).toBe("expired");
    expect(recipientPolicyRowState(rows[1]!.policy)).toBe("active");

    const preview = buildIssuedCertificatePreview(c, "RC-1", "https://x/c");
    expect(preview.kind).toBe("policy-dark");
    if (preview.kind === "policy-dark") {
      expect(preview.model.active).toBe(true);
      expect(preview.model.state).toBe("active");
      expect(preview.model.stampText).toBeNull();
      expect(preview.model.statusLabelText).toContain("1 из 2");
      expect(preview.rows.map((r) => r.rowState)).toEqual(["expired", "active"]);
    }
  });

  it("whole-certificate CANCELLED overrides active recipient rows and summary", () => {
    const split = cert([
      {
        ...partnerBase,
        storeUserId: "a",
        storeName: "Partner A",
        recipientPolicy: {
          validityDays: 30,
          purchaseLimit: 1,
          minimumPurchaseAmount: null,
          promotionsCompatible: false,
          exclusionsText: null,
          policySource: "general",
          validUntil: "2026-01-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 1,
        },
      },
      {
        ...partnerBase,
        storeUserId: "b",
        storeName: "Partner B",
        recipientPolicy: {
          validityDays: 45,
          purchaseLimit: 2,
          minimumPurchaseAmount: null,
          promotionsCompatible: true,
          exclusionsText: null,
          policySource: "individual",
          validUntil: "2026-12-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 2,
        },
      },
    ]);
    const cancelled: StoreCertificate = { ...split, status: "CANCELLED" };
    const preview = buildIssuedCertificatePreview(cancelled, "RC-1", "https://x/c");
    expect(preview.kind).toBe("policy-dark");
    if (preview.kind === "policy-dark") {
      expect(preview.model.active).toBe(false);
      expect(preview.model.state).toBe("cancelled");
      expect(preview.model.statusLabelText).toBe("Сертификат отозван");
      expect(preview.model.stampText).toMatch(/Отозван/i);
      expect(preview.rows.every((r) => r.rowState === "cancelled")).toBe(true);
    }
  });

  it("unknown whole-certificate status is fail-closed unavailable", () => {
    const split = cert([
      {
        ...partnerBase,
        storeUserId: "b",
        storeName: "Partner B",
        recipientPolicy: {
          validityDays: 45,
          purchaseLimit: 2,
          minimumPurchaseAmount: null,
          promotionsCompatible: true,
          exclusionsText: null,
          policySource: "individual",
          validUntil: "2026-12-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 2,
        },
      },
    ]);
    const unknown: StoreCertificate = { ...split, status: "UNKNOWN_STATUS" };
    const preview = buildIssuedCertificatePreview(unknown, "RC-1", "https://x/c");
    expect(preview.kind).toBe("policy-dark");
    if (preview.kind === "policy-dark") {
      expect(preview.model.active).toBe(false);
      expect(preview.model.state).toBe("unavailable");
      expect(preview.model.statusLabelText).toBe("Недоступен");
      expect(preview.rows.every((r) => r.rowState === "unavailable")).toBe(true);
    }
  });

  it("treats unparseable validUntil as expired (fail closed)", () => {
    const policy = {
      validityDays: 30,
      purchaseLimit: 1,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
      policySource: "general" as const,
      validUntil: "not-a-date",
      consumedUses: 0,
      remainingPurchases: 1,
      legacyFallback: false,
    };
    expect(recipientPolicyRowState(policy)).toBe("expired");
  });
});

describe("formatIssuedPolicyRowRestrictions", () => {
  it("includes frozen min purchase and promotions", async () => {
    const { formatIssuedPolicyRowRestrictions } = await import("./certificate-issued-preview");
    expect(
      formatIssuedPolicyRowRestrictions({
        validityDays: 30,
        purchaseLimit: 2,
        minimumPurchaseAmount: 1500,
        promotionsCompatible: true,
        exclusionsText: "Кроме акций",
        policySource: "individual",
        validUntil: "2026-12-01T00:00:00.000Z",
        consumedUses: 0,
        remainingPurchases: 2,
        legacyFallback: false,
      }),
    ).toMatch(/1\s*500/);
    expect(
      formatIssuedPolicyRowRestrictions({
        validityDays: 30,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        policySource: "legacy",
        validUntil: null,
        consumedUses: 0,
        remainingPurchases: 1,
        legacyFallback: true,
      }),
    ).toBe("");
  });
});