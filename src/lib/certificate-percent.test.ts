import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  computeCategoryPercents,
  previewIssuerPercent,
  toPercent,
} from "./certificate-percent.ts";

describe("certificate percent calculation", () => {
  const partnerCategory = {
    category: "doors",
    categoryLabel: "Двери",
    poolPercent: 15,
    discountPercent: 15,
    isSelfScan: false,
  };

  it("rounds like navigator toPercent", () => {
    assert.equal(toPercent(10.126, 0, 100), 10.13);
    assert.equal(toPercent(-5, 0, 100), 0);
    assert.equal(toPercent(200, 0, 15), 15);
  });

  it("partner pool 15%: client 5% → PROF 10%", () => {
    const result = computeCategoryPercents(partnerCategory, "5");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 5);
    assert.equal(result.value.issuerPercent, 10);
  });

  it("partner pool 15%: client 15% → PROF 0%", () => {
    const result = computeCategoryPercents(partnerCategory, "15");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 15);
    assert.equal(result.value.issuerPercent, 0);
  });

  it("partner pool 15%: client 0% → PROF 15%", () => {
    const result = computeCategoryPercents(partnerCategory, "0");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 0);
    assert.equal(result.value.issuerPercent, 15);
  });

  it("self-scan: client 5% → PROF 0%", () => {
    const result = computeCategoryPercents(
      { ...partnerCategory, isSelfScan: true, poolPercent: 100 },
      "5",
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 5);
    assert.equal(result.value.issuerPercent, 0);
  });

  it("rejects empty discount draft", () => {
    const result = computeCategoryPercents(partnerCategory, "");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /Укажите скидку/);
  });

  it("rejects missing pool for partner category", () => {
    const result = computeCategoryPercents(
      { ...partnerCategory, poolPercent: undefined },
      "5",
    );
    assert.equal(result.ok, false);
  });

  it("previewIssuerPercent returns null for invalid input", () => {
    assert.equal(previewIssuerPercent(partnerCategory, ""), null);
    assert.equal(previewIssuerPercent(partnerCategory, "5"), 10);
  });
});

describe("buildCreateCertificatePayload", () => {
  const storePartner = {
    storeUserId: "store-1",
    storeName: "M1 Тестовая сеть",
    partnershipId: "part-1",
    isSelfScan: false,
    categories: [
      {
        category: "doors",
        categoryLabel: "Двери",
        poolPercent: 15,
        discountPercent: 15,
        issuerPercent: 0,
      },
    ],
  };

  const selfPartner = {
    storeUserId: "prof-1",
    storeName: "M1 Мастер PROF",
    partnershipId: null,
    isSelfScan: true,
    categories: [
      {
        category: "doors",
        categoryLabel: "Двери",
        poolPercent: 100,
        discountPercent: 10,
        issuerPercent: 0,
      },
    ],
  };

  it("builds partner payload with recalculated issuerPercent", () => {
    const key = categoryFieldKey("store-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: { [key]: "5" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const cat = result.body.partners[0]!.categories[0]!;
    assert.equal(cat.discountPercent, 5);
    assert.equal(cat.issuerPercent, 10);
  });

  it("keeps self-scan issuerPercent at 0", () => {
    const key = categoryFieldKey("prof-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [selfPartner],
      discountDrafts: { [key]: "7" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const cat = result.body.partners[0]!.categories[0]!;
    assert.equal(cat.discountPercent, 7);
    assert.equal(cat.issuerPercent, 0);
  });

  it("returns field errors instead of throwing for invalid values", () => {
    const key = categoryFieldKey("store-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: { [key]: "" },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.fieldErrors[key], "Укажите скидку клиенту");
  });

  it("does not silently treat empty draft as zero on submit", () => {
    const key = categoryFieldKey("store-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: {},
    });
    // Default from API discountPercent=15 is used when draft absent
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.body.partners[0]!.categories[0]!.discountPercent, 15);
    assert.equal(result.body.partners[0]!.categories[0]!.issuerPercent, 0);

    const cleared = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: { [key]: "   " },
    });
    assert.equal(cleared.ok, false);
  });
});
