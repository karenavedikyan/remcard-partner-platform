import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePoolPercentInput } from "./parse-pool-percent.ts";

describe("parsePoolPercentInput", () => {
  it("rejects empty", () => {
    assert.equal(parsePoolPercentInput("").ok, false);
  });

  it("parses comma decimals", () => {
    const r = parsePoolPercentInput("12,5");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, 12.5);
  });
});
