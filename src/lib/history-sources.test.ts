import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldShowAcceptedBonusEmptyNote,
  shouldShowAcceptedBonusLimitation,
} from "./history-sources.ts";

describe("history source warnings", () => {
  it("shows limitation when accepted bonus source is available", () => {
    assert.equal(shouldShowAcceptedBonusLimitation({ acceptedBonusList: true, issuedOrders: false }), true);
    assert.equal(shouldShowAcceptedBonusLimitation({ acceptedBonusList: false, issuedOrders: true }), false);
  });

  it("shows empty note when source available but no accepted rows", () => {
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedBonusList: true, issuedOrders: true }, 0, false, false),
      true,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedBonusList: true, issuedOrders: true }, 2, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedBonusList: false, issuedOrders: true }, 0, false, false),
      false,
    );
    assert.equal(
      shouldShowAcceptedBonusEmptyNote({ acceptedBonusList: true, issuedOrders: true }, 0, true, false),
      false,
    );
  });
});
