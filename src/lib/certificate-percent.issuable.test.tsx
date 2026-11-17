import { describe, expect, it } from "vitest";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  isCategoryIssuable,
} from "./certificate-percent";
import type { AvailablePartnerCategory } from "./certificate-types";

const cat = (
  category: string,
  poolPercent: number | undefined,
  issuable?: boolean,
): AvailablePartnerCategory => ({
  category,
  categoryLabel: category,
  poolPercent,
  discountPercent: 0,
  issuerPercent: 0,
  ...(issuable === undefined ? {} : { issuable }),
});

const partner = (categories: AvailablePartnerCategory[], isSelfScan = false) => ({
  storeUserId: "s1",
  storeName: "Магазин",
  partnershipId: "p1",
  isSelfScan,
  categories,
});

const key = (c: string) => categoryFieldKey("s1", c);

describe("isCategoryIssuable", () => {
  it("is false for issuable=false, 0%, missing and out-of-range pools", () => {
    expect(isCategoryIssuable({ poolPercent: 5, issuable: false }, false)).toBe(false);
    expect(isCategoryIssuable({ poolPercent: 0, issuable: false }, false)).toBe(false);
    expect(isCategoryIssuable({ poolPercent: 0 }, false)).toBe(false);
    expect(isCategoryIssuable({}, false)).toBe(false);
    expect(isCategoryIssuable({ poolPercent: 101 }, false)).toBe(false);
  });
  it("is true for a positive pool and for self-scan", () => {
    expect(isCategoryIssuable({ poolPercent: 2, issuable: true }, false)).toBe(true);
    expect(isCategoryIssuable({ poolPercent: 2 }, false)).toBe(true);
    expect(isCategoryIssuable({ poolPercent: 0 }, true)).toBe(true);
  });
});

describe("buildCreateCertificatePayload with a 0% category", () => {
  const cats = [cat("doors", 2, true), cat("flooring", 0, false), cat("paint", 4, true)];

  it("wizard: a stale true for the 0% category is ignored, nothing about it is sent or validated", () => {
    const result = buildCreateCertificatePayload({
      selectedPartners: [partner(cats)],
      discountDrafts: { [key("doors")]: "1", [key("paint")]: "1" },
      selectedCategoryKeys: { [key("doors")]: true, [key("flooring")]: true, [key("paint")]: true },
      requireTenthStep: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.partners).toHaveLength(1);
    expect(result.body.partners[0]!.categories.map((c) => c.category)).toEqual(["doors", "paint"]);
  });

  it("wizard: unselected allowed categories are still left out and the 0% one does not rescue an empty selection", () => {
    const result = buildCreateCertificatePayload({
      selectedPartners: [partner(cats)],
      discountDrafts: {},
      selectedCategoryKeys: { [key("flooring")]: true },
      requireTenthStep: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.formError).toBe("Выберите хотя бы одну категорию");
    expect(result.fieldErrors).toEqual({});
  });

  it("default form (no selection map): the partner is sent with its issuable categories only", () => {
    const result = buildCreateCertificatePayload({
      selectedPartners: [partner(cats)],
      discountDrafts: { [key("doors")]: "1", [key("paint")]: "1" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.partners[0]!.categories.map((c) => c.category)).toEqual(["doors", "paint"]);
  });

  it("validation of the allowed categories is unchanged (over the pool still fails, no clamp)", () => {
    const result = buildCreateCertificatePayload({
      selectedPartners: [partner(cats)],
      discountDrafts: { [key("doors")]: "3", [key("paint")]: "1" },
      selectedCategoryKeys: { [key("doors")]: true, [key("flooring")]: true, [key("paint")]: true },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors)).toEqual([key("doors")]);
  });

  it("all categories unavailable: nothing can be issued", () => {
    const dead = [cat("doors", 0, false), cat("flooring", 0, false)];
    const wizard = buildCreateCertificatePayload({
      selectedPartners: [partner(dead)],
      discountDrafts: {},
      selectedCategoryKeys: { [key("doors")]: true, [key("flooring")]: true },
    });
    expect(wizard.ok).toBe(false);
    const plain = buildCreateCertificatePayload({
      selectedPartners: [partner(dead)],
      discountDrafts: {},
    });
    expect(plain.ok).toBe(false);
  });

  it("self-scan owner: every category is issuable and sent as before", () => {
    const self = [cat("doors", undefined, true), cat("paint", undefined, true)];
    const result = buildCreateCertificatePayload({
      selectedPartners: [partner(self, true)],
      discountDrafts: { [key("doors")]: "10", [key("paint")]: "5" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.partners[0]!.categories.map((c) => c.category)).toEqual(["doors", "paint"]);
  });
});
