import { describe, expect, it } from "vitest";
import { resolveSettlementsPageShell } from "./settlements-page-shell";

describe("resolveSettlementsPageShell", () => {
  it("keeps MASTER wallet when R05 is eligible (MASTER+AGENT)", () => {
    expect(
      resolveSettlementsPageShell({ partnerType: "MASTER", r05Eligible: true }),
    ).toBe("master-wallet");
  });

  it("routes pure R05 agent to agent shell", () => {
    expect(
      resolveSettlementsPageShell({
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
        r05Eligible: true,
      }),
    ).toBe("agent-r05");
  });

  it("routes business store owner to master wallet even when R05 eligible", () => {
    expect(
      resolveSettlementsPageShell({
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        r05Eligible: true,
      }),
    ).toBe("master-wallet");
  });

  it("routes org workplace employee CLIENT to business wallet via workplacePartnerType", () => {
    expect(
      resolveSettlementsPageShell({
        partnerType: null,
        role: "CLIENT",
        r05Eligible: true,
        workplacePartnerType: "STORE",
      }),
    ).toBe("master-wallet");
  });

  it("routes PRO MASTER org staff to business wallet when workplaceNavFromOrgContext", () => {
    expect(
      resolveSettlementsPageShell({
        partnerType: "MASTER",
        role: "PRO",
        partnerActivities: ["MASTER", "AGENT"],
        r05Eligible: true,
        workplacePartnerType: "COMPANY",
        navContext: {
          workplacePartnerType: "COMPANY",
          workplaceNavFromOrgContext: true,
        },
      }),
    ).toBe("master-wallet");
  });

  it("routes other PRO users to hub", () => {
    expect(
      resolveSettlementsPageShell({ partnerType: "PROF", r05Eligible: false }),
    ).toBe("hub");
  });
});
