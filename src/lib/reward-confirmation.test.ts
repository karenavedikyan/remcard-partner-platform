import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultRewardDraft, rewardDraftToTerms, rewardTermsToDraft, rewardDateHint } from "./reward-confirmation";
import { parseRubles } from "./reward-lifecycle-types";
describe("per-category confirmation fields", () => {
  it("defaults to 14 days without invented handover", () => {
    assert.deepEqual(rewardDraftToTerms(defaultRewardDraft), { days: 14, kind: "GOODS", fulfilledAt: null });
  });
  it("zero is explicit; server timestamps actual handover", () => {
    assert.deepEqual(rewardDraftToTerms({ days: "0", kind: "SERVICE", handedOver: true }),
      { days: 0, kind: "SERVICE", fulfilledAt: "ON_OPERATION" });
  });
  it("restores immutable retry fields including zero and service", () => {
    const terms = { days: 0, kind: "SERVICE" as const, fulfilledAt: "ON_OPERATION" };
    assert.deepEqual(rewardDraftToTerms(rewardTermsToDraft(terms)), terms);
  });
  for (const days of ["", "-1", "1.5", "14abc", "1e2", "36501"]) {
    it(`rejects invalid term ${JSON.stringify(days)}`, () => {
      assert.throws(() => rewardDraftToTerms({ ...defaultRewardDraft, days }));
    });
  }
  it("previews full calendar days in Moscow", () => {
    assert.match(rewardDateHint({ days: "14", kind: "GOODS", handedOver: true },
      new Date("2026-11-02T13:51:00Z")), /17\.11\.2026.*00:00 МСК/);
    assert.match(rewardDateHint({ ...defaultRewardDraft, handedOver: false }), /после передачи/);
  });
  it("parses kopecks exactly and refuses ambiguous financial inputs", () => {
    assert.equal(parseRubles("11700,15"), 1170015);
    for (const value of ["", "0", "-1", "1.999", "1e5", "NaN"]) assert.throws(() => parseRubles(value));
  });
});
