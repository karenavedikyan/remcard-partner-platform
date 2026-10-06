import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPreviewSessionAllowed, shouldApplyPreviewResponse } from "./scanner-flow.ts";

describe("shouldApplyPreviewResponse", () => {
  it("accepts the latest request id", () => {
    assert.equal(shouldApplyPreviewResponse(2, 2, undefined), true);
  });

  it("rejects stale responses", () => {
    assert.equal(shouldApplyPreviewResponse(1, 2, undefined), false);
  });

  it("rejects aborted responses", () => {
    const controller = new AbortController();
    controller.abort();
    assert.equal(shouldApplyPreviewResponse(2, 2, controller.signal), false);
  });
});

describe("isPreviewSessionAllowed", () => {
  it("accepts allowed preview sessions", () => {
    const session = {
      code: "RC-1",
      preview: {
        allowed: true as const,
        certificate: {
          id: "1",
          promoCode: "RC-1",
          status: "ACTIVE",
          validUntil: null,
          usageCount: 0,
          maxUsages: 0,
          userAlias: null,
          issuer: { label: "Выдал", name: "Test" },
        },
        partner: { id: "p1", storeName: "Store", isSelfScan: false },
        availableCategories: [],
      },
    };
    assert.equal(isPreviewSessionAllowed(session), true);
  });

  it("rejects denied preview sessions", () => {
    assert.equal(
      isPreviewSessionAllowed({
        code: "RC-1",
        preview: { allowed: false, message: "denied" },
      }),
      false,
    );
  });
});
