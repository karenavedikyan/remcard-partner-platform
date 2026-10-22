import { describe, expect, it } from "vitest";
import { resolveCabinetNavMode, usesCabinetPrototypeShell } from "./mode";

describe("resolveCabinetNavMode", () => {
  it("keeps MASTER and MASTER+AGENT on specialist prototype nav", () => {
    expect(
      resolveCabinetNavMode({
        partnerType: "MASTER",
        role: "PRO",
        partnerActivities: ["AGENT", "SERVICE"],
      }),
    ).toBe("master");
    expect(usesCabinetPrototypeShell("master")).toBe(true);
  });

  it("maps store and company PRO owners to business nav", () => {
    expect(
      resolveCabinetNavMode({ partnerType: "STORE", role: "PRO", partnerActivities: ["STORE"] }),
    ).toBe("business-store");
    expect(
      resolveCabinetNavMode({ partnerType: "COMPANY", role: "PRO", partnerActivities: ["STORE"] }),
    ).toBe("business-company");
  });

  it("does not grant business nav to legacy pure-agent STORE+AGENT (activities-only agent)", () => {
    expect(
      resolveCabinetNavMode({
        partnerType: "STORE",
        role: "PRO",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("legacy");
  });

  it("keeps organization employees on legacy nav", () => {
    expect(
      resolveCabinetNavMode({
        partnerType: "STORE",
        role: "CLIENT",
        partnerActivities: [],
      }),
    ).toBe("legacy");
  });
});
