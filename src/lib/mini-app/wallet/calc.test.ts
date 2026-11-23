import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { computeMiniWalletCalc, miniWalletIncomingOnly } from "./calc";
import { stripSettlementPayoutActions } from "./sanitize";
import { MINI_WALLET_FIXTURES } from "./fixtures";
import { rubToKopecks } from "@/lib/wallet-accruals/amounts";

describe("mini-app wallet calc", () => {
  it("agent is incoming-only", () => {
    assert.equal(miniWalletIncomingOnly("agent"), true);
    assert.equal(miniWalletIncomingOnly("store"), false);
  });

  it("aggregates confirmed and waiting in kopecks without double count", () => {
    const calc = computeMiniWalletCalc(MINI_WALLET_FIXTURES.agent, "agent");
    const expectedConfirmedK = rubToKopecks(12_480) + rubToKopecks(4_500);
    const expectedWaitingK = rubToKopecks(3_200);
    assert.equal(Math.round(calc.in.totals.confirmedRub * 100), expectedConfirmedK);
    assert.equal(Math.round(calc.in.totals.waitingRub * 100), expectedWaitingK);
    assert.equal(calc.out.totals.confirmedRub, 0);
  });

  it("specialist has separate in and out confirmed totals", () => {
    const calc = computeMiniWalletCalc(MINI_WALLET_FIXTURES.specialist, "specialist");
    assert.ok(calc.in.totals.confirmedRub > 0);
    assert.ok(calc.out.totals.confirmedRub > 0);
    assert.notEqual(calc.in.totals.confirmedRub, calc.out.totals.confirmedRub);
  });

  it("strips payout action tokens", () => {
    const row = MINI_WALLET_FIXTURES.store.receivable[0]!;
    const withActions = {
      ...MINI_WALLET_FIXTURES.store,
      receivable: [
        {
          ...row,
          payoutActions: { canRecordCash: true, canRecordTransfer: true },
        },
      ],
    };
    const stripped = stripSettlementPayoutActions(withActions);
    assert.equal(stripped.receivable[0]?.payoutActions, undefined);
  });
});
