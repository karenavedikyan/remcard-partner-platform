import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRecommendationCreateDraft,
  clearRecommendationCreateDraftsForUser,
  loadRecommendationCreateDraft,
  recommendationCreateDraftKey,
  reconcileRecommendationDraftWithPartners,
  saveRecommendationCreateDraft,
} from "./recommendation-create-draft";

const scopeA = { userId: "u1", organizationId: null, branchId: null };
const scopeB = { userId: "u1", organizationId: "org1", branchId: null };

describe("recommendation-create-draft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and restores draft for same scope", () => {
    saveRecommendationCreateDraft(scopeA, {
      selectedKeys: ["a:1"],
      discountDrafts: { "a::doors": "5" },
      validityPreset: "3",
    });
    const loaded = loadRecommendationCreateDraft(scopeA);
    expect(loaded?.selectedKeys).toEqual(["a:1"]);
    expect(loaded?.discountDrafts["a::doors"]).toBe("5");
    clearRecommendationCreateDraft(scopeA);
    expect(loadRecommendationCreateDraft(scopeA)).toBeNull();
  });

  it("isolates by user and org/branch context", () => {
    saveRecommendationCreateDraft(scopeA, {
      selectedKeys: ["x"],
      discountDrafts: {},
      validityPreset: "1",
    });
    expect(loadRecommendationCreateDraft(scopeB)).toBeNull();
    expect(recommendationCreateDraftKey(scopeA)).not.toBe(recommendationCreateDraftKey(scopeB));
    expect(loadRecommendationCreateDraft({ userId: "u2", organizationId: null, branchId: null })).toBeNull();
  });

  it("clears all drafts for user on logout helper", () => {
    saveRecommendationCreateDraft(scopeA, {
      selectedKeys: [],
      discountDrafts: {},
      validityPreset: "3",
    });
    saveRecommendationCreateDraft(scopeB, {
      selectedKeys: [],
      discountDrafts: {},
      validityPreset: "6",
    });
    clearRecommendationCreateDraftsForUser("u1");
    expect(loadRecommendationCreateDraft(scopeA)).toBeNull();
    expect(loadRecommendationCreateDraft(scopeB)).toBeNull();
  });

  it("treats sessionStorage getter failures as unavailable", () => {
    const original = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
    saveRecommendationCreateDraft(scopeA, {
      selectedKeys: [],
      discountDrafts: {},
      validityPreset: "3",
    });
    expect(loadRecommendationCreateDraft(scopeA)).toBeNull();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: original,
    });
  });

  it("reconciles stale partner keys against current GET", () => {
    const out = reconcileRecommendationDraftWithPartners({
      selectedKeys: ["gone:1", "keep:2"],
      discountDrafts: { "keep::doors": "7", "gone::doors": "3" },
      partnerKeys: new Set(["keep:2"]),
    });
    expect(out.selectedKeys).toEqual(["keep:2"]);
    expect(out.stalePartnerKeys).toEqual(["gone:1"]);
    expect(out.discountDrafts).toEqual({ "keep::doors": "7" });
  });
});
