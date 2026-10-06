import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldShowAcceptedAccessDeniedNote,
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
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: false }, 0, false, false, false),
      true,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: true }, 2, false, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: false, issuedOrders: true }, 0, false, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: false }, 0, true, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedOrders: true, issuedOrders: false }, 0, false, false, true),
      false,
    );
  });

  it("shows access denied note without treating store 403 as empty accepted history", () => {
    assert.equal(shouldShowAcceptedAccessDeniedNote(true, false, false), true);
    assert.equal(shouldShowAcceptedAccessDeniedNote(true, true, false), false);
    assert.equal(shouldShowAcceptedAccessDeniedNote(false, false, false), false);
  });
});
