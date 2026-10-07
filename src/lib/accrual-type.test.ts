import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accrualDetailHref, parseAccrualType } from "./accrual-type";

describe("parseAccrualType", () => {
  it("accepts bonus and agentBonus only", () => {
    assert.equal(parseAccrualType("bonus"), "bonus");
    assert.equal(parseAccrualType("agentBonus"), "agentBonus");
    assert.equal(parseAccrualType("Bonus"), undefined);
    assert.equal(parseAccrualType(""), undefined);
    assert.equal(parseAccrualType(undefined), undefined);
  });
});

describe("accrualDetailHref", () => {
  it("includes type query for settlement links", () => {
    assert.equal(
      accrualDetailHref("acc-1", "agentBonus"),
      "/history/accruals/acc-1?type=agentBonus",
    );
    assert.equal(accrualDetailHref("acc-1"), "/history/accruals/acc-1");
  });
});
