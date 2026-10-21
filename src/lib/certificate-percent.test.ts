import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  computeCategoryPercents,
  formatDiscountLimitError,
  previewIssuerPercent,
  roundPercent,
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

  it("rounds like navigator toPercent helper", () => {
    assert.equal(toPercent(10.126, 0, 100), 10.13);
    assert.equal(roundPercent(10.126), 10.13);
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

  it("partner pool 15%: client 20% → error, no silent clamp", () => {
    const result = computeCategoryPercents(partnerCategory, "20");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "over_limit");
    assert.equal(result.message, formatDiscountLimitError(15));
  });

  it("rejects negative discount", () => {
    const result = computeCategoryPercents(partnerCategory, "-1");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "negative");
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

  it("self-scan: rejects over 100% without clamping", () => {
    const result = computeCategoryPercents(
      { ...partnerCategory, isSelfScan: true, poolPercent: 100 },
      "101",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "over_limit");
  });

  it("legacy default allows 1.25 on pool 10", () => {
    const cat = { ...partnerCategory, poolPercent: 10 };
    const result = computeCategoryPercents(cat, "1.25");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 1.25);
    assert.equal(result.value.issuerPercent, 8.75);
  });

  it("specialist tenth-step rejects 1.25 on pool 10", () => {
    const cat = { ...partnerCategory, poolPercent: 10 };
    const result = computeCategoryPercents(cat, "1.25", { requireTenthStep: true });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "invalid");
  });

  it("specialist tenth-step allows 1.2 on pool 10", () => {
    const cat = { ...partnerCategory, poolPercent: 10 };
    const result = computeCategoryPercents(cat, "1.2", { requireTenthStep: true });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 1.2);
    assert.equal(result.value.issuerPercent, 8.8);
  });

  it("rejects empty discount draft", () => {
    const result = computeCategoryPercents(partnerCategory, "");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "empty");
  });

  it("rejects missing pool for partner category", () => {
    const result = computeCategoryPercents(
      { ...partnerCategory, poolPercent: undefined },
      "5",
    );
    assert.equal(result.ok, false);
  });

  it("previewIssuerPercent returns null for over-limit input", () => {
    assert.equal(previewIssuerPercent(partnerCategory, "20"), null);
    assert.equal(previewIssuerPercent(partnerCategory, "5"), 10);
  });

  it("pool 20% after term change: client 7% → PROF 13%", () => {
    const result = computeCategoryPercents({ ...partnerCategory, poolPercent: 20 }, "7");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.discountPercent, 7);
    assert.equal(result.value.issuerPercent, 13);
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

  it("does not build payload when discount exceeds agreed pool", () => {
    const key = categoryFieldKey("store-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: { [key]: "20" },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.fieldErrorReasons[key], "over_limit");
    assert.match(result.fieldErrors[key] ?? "", /Согласовано 15%/);
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

  it("sends only selected categories when selectedCategoryKeys is set", () => {
    const twoCatPartner = {
      ...storePartner,
      categories: [
        storePartner.categories[0]!,
        {
          category: "windows",
          categoryLabel: "Окна",
          poolPercent: 10,
          discountPercent: 4,
          issuerPercent: 6,
        },
      ],
    };
    const doorsKey = categoryFieldKey("store-1", "doors");
    const windowsKey = categoryFieldKey("store-1", "windows");
    const result = buildCreateCertificatePayload({
      selectedPartners: [twoCatPartner],
      discountDrafts: { [doorsKey]: "3", [windowsKey]: "2" },
      selectedCategoryKeys: { [doorsKey]: true, [windowsKey]: false },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.body.partners.length, 1);
    assert.equal(result.body.partners[0]!.categories.length, 1);
    assert.equal(result.body.partners[0]!.categories[0]!.category, "doors");
  });

  it("uses API default when draft absent and rejects cleared whitespace", () => {
    const key = categoryFieldKey("store-1", "doors");
    const result = buildCreateCertificatePayload({
      selectedPartners: [storePartner],
      discountDrafts: {},
    });
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
