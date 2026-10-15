import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, formatPhoneInput } from "./contact-phone-display";

describe("contact-phone-display", () => {
  it("formats stored +7 for display", () => {
    expect(formatPhoneForDisplay("+79186360088")).toBe("+7 (918) 636-00-88");
  });

  it("formats partial input without breaking cursor-friendly segments", () => {
    expect(formatPhoneInput("918636")).toContain("+7 (918) 636");
  });
});
