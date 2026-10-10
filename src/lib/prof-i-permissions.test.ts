import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionIdsFromFlags,
  flagsFromActionIds,
  normalizePermissionFlags,
  toggleActionInSet,
} from "./prof-i-permissions.ts";

describe("prof-i-permissions (client)", () => {
  it("enables ledger when cash is toggled on", () => {
    const flags = flagsFromActionIds(toggleActionInSet([], "cash", true));
    assert.equal(flags.canPayBonusCash, true);
    assert.equal(flags.canViewWallet, true);
  });

  it("clears payout flags when ledger is toggled off", () => {
    const ids = toggleActionInSet(["ledger", "cash", "transfer"], "ledger", false);
    const flags = flagsFromActionIds(ids);
    assert.equal(flags.canPayBonusCash, false);
    assert.equal(flags.canPayBonusTransfer, false);
    assert.equal(flags.canViewWallet, false);
  });

  it("round-trips action ids", () => {
    const ids = ["clients", "scan", "sale", "own"] as const;
    const back = actionIdsFromFlags(flagsFromActionIds([...ids]));
    assert.deepEqual(back, ids);
  });
});
