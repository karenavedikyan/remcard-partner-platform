import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRecommendationCreateDraft,
  loadRecommendationCreateDraft,
  recommendationCreateDraftKey,
  saveRecommendationCreateDraft,
} from "./recommendation-create-draft";

describe("recommendation-create-draft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and restores draft for same user", () => {
    saveRecommendationCreateDraft("u1", {
      selectedKeys: ["a:1"],
      discountDrafts: { k: "5" },
      validityPreset: "3",
    });
    const loaded = loadRecommendationCreateDraft("u1");
    expect(loaded?.selectedKeys).toEqual(["a:1"]);
    expect(loaded?.discountDrafts.k).toBe("5");
    clearRecommendationCreateDraft("u1");
    expect(loadRecommendationCreateDraft("u1")).toBeNull();
  });

  it("isolates by user id", () => {
    saveRecommendationCreateDraft("u1", {
      selectedKeys: ["x"],
      discountDrafts: {},
      validityPreset: "1",
    });
    expect(loadRecommendationCreateDraft("u2")).toBeNull();
    expect(recommendationCreateDraftKey("u1")).toContain("u1");
  });
});
