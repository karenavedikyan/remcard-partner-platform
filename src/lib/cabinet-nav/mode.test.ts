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

  it("does not grant business nav to pure-agent STORE+AGENT (activities-only agent)", () => {
    expect(
      resolveCabinetNavMode({
        partnerType: "STORE",
        role: "PRO",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("agent");
  });

  it("keeps organization employees on legacy nav without workplace context", () => {
    expect(
      resolveCabinetNavMode({
        partnerType: "STORE",
        role: "CLIENT",
        partnerActivities: [],
      }),
    ).toBe("legacy");
  });

  it("maps org employees to business nav via trusted workplacePartnerType", () => {
    expect(
      resolveCabinetNavMode(
        { partnerType: "MASTER", role: "PRO", partnerActivities: ["AGENT"] },
        { workplacePartnerType: "STORE", workplaceNavFromOrgContext: true },
      ),
    ).toBe("business-store");
    expect(
      resolveCabinetNavMode(
        { partnerType: null, role: "CLIENT", partnerActivities: [] },
        { workplacePartnerType: "STORE" },
      ),
    ).toBe("business-store");
    expect(
      resolveCabinetNavMode(
        { partnerType: null, role: "CLIENT", partnerActivities: [] },
        { workplacePartnerType: "COMPANY" },
      ),
    ).toBe("business-company");
  });

  it("never returns legacy for an owner of any partner type", () => {
    const owners: Array<[Parameters<typeof resolveCabinetNavMode>[0], string]> = [
      [{ partnerType: "STORE", role: "PRO", partnerActivities: ["STORE"] }, "business-store"],
      [{ partnerType: "COMPANY", role: "PRO", partnerActivities: ["STORE", "SERVICE"] }, "business-company"],
      [{ partnerType: "MASTER", role: "PRO", partnerActivities: ["SERVICE"] }, "master"],
      [{ partnerType: "COMPANY", role: "PRO", partnerActivities: ["AGENT"] }, "agent"],
    ];
    for (const [user, mode] of owners) {
      expect(resolveCabinetNavMode(user)).toBe(mode);
    }
  });

  describe("employees follow the workplace they work in", () => {
    const employee = { partnerType: null, role: "CLIENT", partnerActivities: [] } as const;

    it("employee of a specialist gets the specialist shell", () => {
      expect(resolveCabinetNavMode(employee, { employerWorkplaceKind: "MASTER" })).toBe("master");
    });

    it("employee of an agent gets the agent shell", () => {
      expect(resolveCabinetNavMode(employee, { employerWorkplaceKind: "AGENT" })).toBe("agent");
    });

    it("employee of a store / company keeps the business shell (with or without branch)", () => {
      expect(
        resolveCabinetNavMode(employee, { workplacePartnerType: "STORE", workplaceNavFromOrgContext: true }),
      ).toBe("business-store");
      expect(
        resolveCabinetNavMode(employee, { workplacePartnerType: "COMPANY", workplaceNavFromOrgContext: true }),
      ).toBe("business-company");
    });

    it("the employer's shell wins over the employee's own personal profile", () => {
      expect(
        resolveCabinetNavMode(
          { partnerType: "STORE", role: "PRO", partnerActivities: ["STORE"] },
          { employerWorkplaceKind: "AGENT" },
        ),
      ).toBe("agent");
    });

    it("an employee of an unclassified employer stays on the fallback", () => {
      expect(resolveCabinetNavMode(employee, { employerWorkplaceKind: null })).toBe("legacy");
    });
  });
});
