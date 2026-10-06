import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldShowAcceptedBonusEmptyNote,
  shouldShowAcceptedBonusLimitation,
} from "./history-sources.ts";

describe("history source warnings", () => {
  it("does not show legacy limitation once accepted-order API is used", () => {
    assert.equal(shouldShowAcceptedBonusLimitation({ acceptedOrders: true, issuedOrders: false }), false);
    assert.equal(shouldShowAcceptedBonusLimitation({ acceptedOrders: false, issuedOrders: true }), false);
  });

  it("shows empty note when accepted source available but no accepted rows", () => {
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: false }, 0, false, false),
      true,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: true }, 2, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: false, issuedOrders: true }, 0, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: false }, 0, true, false),
      false,
    );
  });
});
