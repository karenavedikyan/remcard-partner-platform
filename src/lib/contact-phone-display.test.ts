import { describe, expect, it } from "vitest";
import {
  canonicalizeRuContactPhone,
  formatPhoneForDisplay,
  formatPhoneInput,
  isCompleteRuPhone,
  sanitizePhoneTyping,
} from "./contact-phone-display";

describe("contact-phone-display", () => {
  const samples = ["89186360088", "79186360088", "9186360088", "+79186360088", "+7 (918) 636-00-88"];

  it.each(samples)("canonicalizes %s to +79186360088", (raw) => {
    expect(canonicalizeRuContactPhone(raw)).toBe("+79186360088");
    expect(formatPhoneForDisplay(raw)).toBe("+7 (918) 636-00-88");
  });

  it("does not turn letters into a valid RU number", () => {
    expect(canonicalizeRuContactPhone("abc918")).toBe("");
    expect(sanitizePhoneTyping("abc918")).toBe("918");
  });

  it("keeps partial input editable via sanitize without forced completion", () => {
    expect(sanitizePhoneTyping("918 63")).toBe("918 63");
    expect(isCompleteRuPhone("918 63")).toBe(false);
  });

  it("formatPhoneInput returns display for complete numbers", () => {
    expect(formatPhoneInput("89186360088")).toBe("+7 (918) 636-00-88");
  });
});
