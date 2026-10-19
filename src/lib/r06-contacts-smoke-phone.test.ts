import { describe, expect, it } from "vitest";
import { canonicalizeRuContactPhone } from "@/lib/contact-phone-display";

const EXPECT = "+79186360088";

describe("R06 contacts smoke phone UI compare", () => {
  it("accepts formatted display matching canonical +79186360088", () => {
    expect(canonicalizeRuContactPhone("+7 (918) 636-00-88")).toBe(EXPECT);
  });

  it("rejects empty display", () => {
    expect(canonicalizeRuContactPhone("")).toBe("");
  });

  it("rejects a different +7 number", () => {
    expect(canonicalizeRuContactPhone("+7 (999) 111-22-33")).not.toBe(EXPECT);
  });
});
