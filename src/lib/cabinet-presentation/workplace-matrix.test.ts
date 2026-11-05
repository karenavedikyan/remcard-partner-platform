import { describe, expect, it } from "vitest";
import { resolveCabinetNavMode } from "@/lib/cabinet-nav/mode";
import { resolveWorkplacePartnerTypeResolution } from "./resolve";

describe("workplace resolution regression matrix", () => {
  it("PRO personal STORE employee at COMPANY org uses org context", () => {
    const resolution = resolveWorkplacePartnerTypeResolution({
      user: {
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      },
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o1", name: "Co", partnerType: "COMPANY" },
      },
      contextReady: true,
    });
    expect(resolution).toEqual({ partnerType: "COMPANY", source: "org-context" });
    expect(
      resolveCabinetNavMode(
        { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        {
          workplacePartnerType: resolution.partnerType,
          workplaceNavFromOrgContext: true,
        },
      ),
    ).toBe("business-company");
  });

  it("PRO MASTER personal profile at STORE org uses business-store nav", () => {
    const resolution = resolveWorkplacePartnerTypeResolution({
      user: {
        role: "PRO",
        partnerType: "MASTER",
        partnerActivities: ["MASTER", "AGENT"],
      },
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o2", name: "Shop", partnerType: "STORE" },
      },
      contextReady: true,
    });
    expect(resolution.source).toBe("org-context");
    expect(
      resolveCabinetNavMode(
        { role: "PRO", partnerType: "MASTER", partnerActivities: ["AGENT"] },
        {
          workplacePartnerType: resolution.partnerType,
          workplaceNavFromOrgContext: true,
        },
      ),
    ).toBe("business-store");
  });

  it("CLIENT org employee ignores absent personal profile", () => {
    expect(
      resolveWorkplacePartnerTypeResolution({
        user: { role: "CLIENT", partnerType: null, partnerActivities: [] },
        proContext: {
          role: "ORG_TEAM_MEMBER",
          organization: { id: "o3", name: "Shop", partnerType: "STORE" },
        },
        contextReady: true,
      }),
    ).toEqual({ partnerType: "STORE", source: "org-context" });
  });
});
