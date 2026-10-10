import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { payoutConfirmLabel, PAYOUT_EXTERNAL_FACT_NOTE } from "./payout-record";

describe("payout-record copy", () => {
  it("uses external-fact wording for cash and transfer", () => {
    assert.match(PAYOUT_EXTERNAL_FACT_NOTE, /вне RemCard/i);
    assert.match(payoutConfirmLabel("CASH"), /наличными/i);
    assert.match(payoutConfirmLabel("TRANSFER"), /перевод/i);
    assert.doesNotMatch(payoutConfirmLabel("TRANSFER"), /отправлен/i);
  });
});
