import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMoneyRub } from "./history-format.ts";

describe("formatMoneyRub", () => {
  it("keeps whole rubles without decimals", () => {
    assert.equal(formatMoneyRub(700), "700 ₽");
  });

  it("shows kopecks when amount is fractional", () => {
    assert.match(formatMoneyRub(700.5), /700,50 ₽/);
  });
});
