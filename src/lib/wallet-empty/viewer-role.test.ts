import { describe, expect, it } from "vitest";
import { resolveWalletEmptyViewerRole, isSupportedWalletEmptyViewerRole } from "./viewer-role";

describe("isSupportedWalletEmptyViewerRole", () => {
  it("accepts only the four onboarding roles", () => {
    expect(isSupportedWalletEmptyViewerRole("agent")).toBe(true);
    expect(isSupportedWalletEmptyViewerRole(undefined)).toBe(false);
    expect(isSupportedWalletEmptyViewerRole(null)).toBe(false);
  });
});

describe("resolveWalletEmptyViewerRole", () => {
  it("maps shells and partner types to four roles", () => {
    expect(
      resolveWalletEmptyViewerRole({
        shell: "agent-r05",
        navMode: "legacy",
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("agent");
    expect(
      resolveWalletEmptyViewerRole({
        shell: "master-wallet",
        navMode: "master",
        partnerType: "MASTER",
        partnerActivities: ["MASTER"],
      }),
    ).toBe("specialist");
    expect(
      resolveWalletEmptyViewerRole({
        shell: "master-wallet",
        navMode: "business-store",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
    ).toBe("store");
    expect(
      resolveWalletEmptyViewerRole({
        shell: "master-wallet",
        navMode: "business-company",
        partnerType: "COMPANY",
        partnerActivities: ["COMPANY"],
      }),
    ).toBe("company");
  });

  it("routes hub PRO agent (R05 off) to agent onboarding", () => {
    expect(
      resolveWalletEmptyViewerRole({
        shell: "hub",
        navMode: "legacy",
        partnerType: "PROF",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("agent");
  });
});
