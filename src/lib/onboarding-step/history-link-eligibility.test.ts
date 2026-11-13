import { describe, expect, it } from "vitest";
import { canLinkOnboardingHistoryFromUserRole } from "./history-link-eligibility";

describe("canLinkOnboardingHistoryFromUserRole", () => {
  it("allows PRO session role", () => {
    expect(canLinkOnboardingHistoryFromUserRole("PRO")).toBe(true);
  });

  it("denies non-PRO", () => {
    expect(canLinkOnboardingHistoryFromUserRole("CLIENT")).toBe(false);
  });
});
