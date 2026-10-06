import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RemcardApiError } from "./api-client.ts";
import {
  isPreviewSessionAllowed,
  isUncertainOrderFailure,
  shouldApplyPreviewResponse,
} from "./scanner-flow.ts";

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

describe("isUncertainOrderFailure", () => {
  it("treats HTTP 504 as uncertain", () => {
    assert.equal(isUncertainOrderFailure(new RemcardApiError(504, "Upstream timeout")), true);
  });

  it("treats HTTP 500 as uncertain", () => {
    assert.equal(isUncertainOrderFailure(new RemcardApiError(500, "Server error")), true);
  });

  it("treats network errors as uncertain", () => {
    assert.equal(isUncertainOrderFailure(new RemcardApiError(0, "Сетевая ошибка")), true);
  });

  it("treats validation errors as certain failures", () => {
    assert.equal(isUncertainOrderFailure(new RemcardApiError(400, "Некорректная сумма")), false);
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
