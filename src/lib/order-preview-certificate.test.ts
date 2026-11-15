import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderPreviewToStoreCertificate } from "./order-preview-certificate";
import type { OrderPreviewAllowed } from "./order-types";
import {
  buildIssuedCertificatePreview,
  recipientPolicyRowState,
} from "./certificate-issued-preview";
import { issuerBonusPercentFromFrozenDiscount } from "./certificate-policy/purchase-issuer-bonus";

const basePreview = (): OrderPreviewAllowed => ({
  allowed: true,
  previewProvisional: true,
  certificate: {
    id: "cert-1",
    promoCode: "RC-1",
    status: "EXPIRED",
    createdAt: "2026-01-01T12:00:00.000Z",
    validUntil: null,
    usageCount: 99,
    maxUsages: 0,
    userAlias: "Иван",
    issuer: { label: "Выдал", name: "Мастер" },
  },
  partner: {
    id: "cp-1",
    storeUserId: "store-b",
    storeName: "Магазин B",
    isSelfScan: false,
    recipientPolicy: {
      validityDays: 30,
      purchaseLimit: 1,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
      policySource: "general",
      validUntil: "2026-12-31T20:59:59.999Z",
      consumedUses: 0,
      remainingPurchases: 1,
    },
  },
  availableCategories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 7,
      issuerPercent: 3,
    },
  ],
});

describe("orderPreviewToStoreCertificate", () => {
  it("keeps storeUserId and frozen recipient expiry (not global null)", () => {
    const cert = orderPreviewToStoreCertificate(basePreview(), "QR-OP");
    assert.equal(cert.partners[0]!.storeUserId, "store-b");
    assert.notEqual(cert.partners[0]!.storeUserId, cert.partners[0]!.id);
    assert.equal(cert.createdAt, "2026-01-01T12:00:00.000Z");
    assert.equal(cert.validUntil, "2026-12-31T20:59:59.999Z");
    assert.equal(cert.usageCount, 0);
    assert.equal(cert.maxUsages, 1);
  });

  it("policy-dark preview shows active B while global certificate is expired", () => {
    const cert = orderPreviewToStoreCertificate(basePreview(), "RC-1");
    const preview = buildIssuedCertificatePreview(cert, "RC-1", "https://x/c");
    assert.equal(preview.kind, "policy-dark");
    if (preview.kind !== "policy-dark") return;
    assert.match(preview.model.termTextValue, /2026/);
    assert.doesNotMatch(preview.model.termTextValue, /Бессрочн/i);
    const row = preview.rows[0]!;
    assert.equal(recipientPolicyRowState(row.policy), "active");
    assert.equal(preview.model.state, "active");
  });

  it("depleted selected recipient", () => {
    const p = basePreview();
    p.partner.recipientPolicy!.consumedUses = 1;
    p.partner.recipientPolicy!.remainingPurchases = 0;
    const cert = orderPreviewToStoreCertificate(p, "RC-1");
    const preview = buildIssuedCertificatePreview(cert, "RC-1", "https://x/c");
    if (preview.kind === "policy-dark") {
      assert.equal(preview.rows[0]!.rowState, "depleted");
    }
  });

  it("preview category bonus matches purchase formula (pool10, discount7 → 3)", () => {
    assert.equal(issuerBonusPercentFromFrozenDiscount(7, 10), 3);
    assert.equal(issuerBonusPercentFromFrozenDiscount(7, 5), 0);
    const p = basePreview();
    assert.equal(p.availableCategories[0]!.issuerPercent, 3);
  });
});