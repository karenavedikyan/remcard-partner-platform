import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCertificatePdfProxyPath,
  certificateDisplayTitle,
  clientVisibleDiscountSummary,
  getCertificateCodeForApi,
  isTestCertificateUrl,
  resolveCertificatePageUrl,
} from "./certificate-url.ts";

describe("certificate url helpers", () => {
  it("prefers server certificateUrl", () => {
    assert.equal(
      resolveCertificatePageUrl({
        certificateUrl: "https://remcard.ru/certificate/abc",
        qrCode: "xyz",
      }),
      "https://remcard.ru/certificate/abc",
    );
  });

  it("uses promo code for pdf path", () => {
    assert.equal(
      getCertificateCodeForApi({ promoCode: "RC-ABC123", qrCode: "qr1" }),
      "RC-ABC123",
    );
    assert.equal(
      buildCertificatePdfProxyPath({ promoCode: "RC-ABC123", qrCode: "qr1" }),
      "/api/remcard/api/certificate/RC-ABC123/pdf",
    );
  });

  it("detects test-only public urls", () => {
    assert.equal(isTestCertificateUrl("http://127.0.0.1:3001/certificate/x"), true);
    assert.equal(isTestCertificateUrl("https://pro.remcard.ru/certificate/x"), true);
    assert.equal(isTestCertificateUrl("https://remcard.ru/certificate/x"), false);
  });

  it("builds client-visible discount summary without issuer percents", () => {
    const summary = clientVisibleDiscountSummary({
      id: "1",
      promoCode: "RC-1",
      qrCode: "q",
      status: "ACTIVE",
      validUntil: null,
      maxUsages: 0,
      usageCount: 0,
      createdAt: "",
      partners: [
        {
          id: "p1",
          storeUserId: "s1",
          storeName: "Store",
          partnershipId: "part1",
          isSelfScan: false,
          categories: [
            { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
          ],
        },
      ],
    });
    assert.equal(summary, "10%");
    assert.equal(certificateDisplayTitle({ id: "1", promoCode: "", qrCode: "", status: "ACTIVE", validUntil: null, maxUsages: 0, usageCount: 0, createdAt: "", storeNames: ["Магазин A"] }), "Магазин A");
  });
});
