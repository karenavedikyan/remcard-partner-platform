import { describe, expect, it } from "vitest";
import { partnersPageReturnPath } from "@/lib/partners-return-path";
import { sanitizeReturnTo } from "@/lib/auth-flow";

describe("partnersPageReturnPath", () => {
  it("includes terms query for deep link returnTo", () => {
    const path = partnersPageReturnPath({ terms: "part-abc" });
    expect(path).toBe("/partners?terms=part-abc");
    expect(sanitizeReturnTo(path)).toBe(path);
  });

  it("falls back to /partners without query", () => {
    expect(partnersPageReturnPath({})).toBe("/partners");
  });
});
