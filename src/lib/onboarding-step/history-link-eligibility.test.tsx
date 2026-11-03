import { describe, expect, it } from "vitest";
import {
  canLinkOnboardingHistoryFromUserRole,
  canLinkOnboardingReadOnlyHistoryFromProContext,
  canOpenOnboardingReadOnlyHistory,
} from "./history-link-eligibility";

describe("canLinkOnboardingHistoryFromUserRole", () => {
  it("is true only for PRO", () => {
    expect(canLinkOnboardingHistoryFromUserRole("PRO")).toBe(true);
    expect(canLinkOnboardingHistoryFromUserRole("CLIENT")).toBe(false);
    expect(canLinkOnboardingHistoryFromUserRole(undefined)).toBe(false);
    expect(canLinkOnboardingHistoryFromUserRole(null)).toBe(false);
  });
});

describe("canLinkOnboardingReadOnlyHistoryFromProContext", () => {
  it("allows only ORG_OWNER", () => {
    expect(canLinkOnboardingReadOnlyHistoryFromProContext("ORG_OWNER")).toBe(true);
    expect(canLinkOnboardingReadOnlyHistoryFromProContext("MANAGER")).toBe(false);
  });
});

describe("canOpenOnboardingReadOnlyHistory", () => {
  it("blocks CLIENT session roles", () => {
    expect(
      canOpenOnboardingReadOnlyHistory({
        sessionRole: "CLIENT",
        proContextRole: "ORG_OWNER",
      }),
    ).toBe(false);
  });
});
