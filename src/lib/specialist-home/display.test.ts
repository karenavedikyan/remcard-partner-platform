import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formattedMoneyWrapGroups } from "./display.ts";

describe("formattedMoneyWrapGroups", () => {
  it("splits thousands groups without breaking digits inside a group", () => {
    assert.deepEqual(formattedMoneyWrapGroups("5 123 456 ₽"), ["5", "123", "456", "₽"]);
    assert.deepEqual(formattedMoneyWrapGroups("2 345 678 ₽"), ["2", "345", "678", "₽"]);
    assert.deepEqual(formattedMoneyWrapGroups("1 500 ₽"), ["1", "500", "₽"]);
    assert.deepEqual(formattedMoneyWrapGroups("0 ₽"), ["0", "₽"]);
  });

  it("preserves fractional kopecks on the last numeric group", () => {
    assert.deepEqual(formattedMoneyWrapGroups("1 234,56 ₽"), ["1", "234,56", "₽"]);
  });

  it("returns null for non-money labels", () => {
    assert.equal(formattedMoneyWrapGroups("—"), null);
    assert.equal(formattedMoneyWrapGroups("…"), null);
    assert.equal(formattedMoneyWrapGroups("12"), null);
  });
});
