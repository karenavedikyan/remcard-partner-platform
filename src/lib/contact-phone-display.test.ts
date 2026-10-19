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

  it("rejects explicit foreign + prefix", () => {
    expect(canonicalizeRuContactPhone("+4412345678")).toBe("");
    expect(isCompleteRuPhone("+4412345678")).toBe(false);
  });

  it("does not strip letters while typing", () => {
    expect(sanitizePhoneTyping("abc918")).toBe("abc918");
    expect(canonicalizeRuContactPhone("abc9186360088")).toBe("");
    expect(canonicalizeRuContactPhone("abc918")).toBe("");
  });

  it("keeps partial input editable without forced completion", () => {
    expect(sanitizePhoneTyping("918 63")).toBe("918 63");
    expect(isCompleteRuPhone("918 63")).toBe(false);
  });

  it("allows empty optional phone", () => {
    expect(canonicalizeRuContactPhone("")).toBe("");
    expect(canonicalizeRuContactPhone("   ")).toBe("");
  });

  it("rejects excess digits", () => {
    expect(canonicalizeRuContactPhone("891863600881234")).toBe("");
  });

  it("formatPhoneInput returns display for complete numbers", () => {
    expect(formatPhoneInput("89186360088")).toBe("+7 (918) 636-00-88");
  });

  describe("R06 contacts smoke reload UI compare", () => {
    const expectCanonical = "+79186360088";

    it("accepts formatted UI display for strict reload compare", () => {
      expect(canonicalizeRuContactPhone("+7 (918) 636-00-88")).toBe(expectCanonical);
    });

    it("rejects empty UI display", () => {
      expect(canonicalizeRuContactPhone("")).toBe("");
    });

    it("rejects a different +7 number", () => {
      expect(canonicalizeRuContactPhone("+7 (999) 111-22-33")).not.toBe(expectCanonical);
    });
  });
});
