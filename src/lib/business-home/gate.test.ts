import { describe, expect, it } from "vitest";
import {
  businessHomeNavContextFromPresentation,
  businessOwnerHomePartnerType,
  shouldRenderBusinessOwnerHome,
} from "./gate";
import { resolveCabinetPresentation } from "@/lib/cabinet-presentation/resolve";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

describe("business owner home gate", () => {
  it("enables prototype home for store and company PRO owners", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
    ).toBe(true);
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "COMPANY",
        partnerActivities: ["COMPANY"],
      }),
    ).toBe(true);
  });

  it("keeps legacy home for pure agent even when partnerType is STORE", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
      }),
    ).toBe(false);
  });

  it("enables business home for org employee via workplace partner type", () => {
    expect(
      shouldRenderBusinessOwnerHome(
        { role: "CLIENT", partnerType: null, partnerActivities: [] },
        { workplacePartnerType: "STORE" },
      ),
    ).toBe(true);
    expect(
      businessOwnerHomePartnerType({ partnerType: null }, "COMPANY"),
    ).toBe("COMPANY");
  });

  it("enables business home for PRO AGENT/MASTER org staff when org-context provenance is set", () => {
    const storeCtx: ProContextSnapshot = {
      role: "BRANCH_MANAGER",
      organization: { id: "o-store", name: "Store", partnerType: "STORE" },
      branches: [],
      activeBranch: null,
    };
    const companyCtx: ProContextSnapshot = {
      role: "ORG_TEAM_MEMBER",
      organization: { id: "o-co", name: "Co", partnerType: "COMPANY" },
      branches: [],
      activeBranch: null,
    };

    const storePresentation = resolveCabinetPresentation({
      user: {
        id: "a1",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
        displayName: "Agent",
      },
      proContext: storeCtx,
      contextReady: true,
      contextHttpStatus: 200,
    });
    const nav = businessHomeNavContextFromPresentation(storePresentation);
    expect(
      shouldRenderBusinessOwnerHome(
        { role: "PRO", partnerType: "AGENT", partnerActivities: ["AGENT"] },
        nav,
      ),
    ).toBe(true);

    const masterAgentPresentation = resolveCabinetPresentation({
      user: {
        id: "m1",
        role: "PRO",
        partnerType: "MASTER",
        partnerActivities: ["MASTER", "AGENT"],
        displayName: "Master Agent",
      },
      proContext: storeCtx,
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(
      shouldRenderBusinessOwnerHome(
        { role: "PRO", partnerType: "MASTER", partnerActivities: ["MASTER", "AGENT"] },
        businessHomeNavContextFromPresentation(masterAgentPresentation),
      ),
    ).toBe(true);

    const companyPresentation = resolveCabinetPresentation({
      user: {
        id: "a2",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
        displayName: "Team Agent",
      },
      proContext: companyCtx,
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(
      shouldRenderBusinessOwnerHome(
        { role: "PRO", partnerType: "AGENT", partnerActivities: ["AGENT"] },
        businessHomeNavContextFromPresentation(companyPresentation),
      ),
    ).toBe(true);
  });

  it("keeps legacy home for non-pro without workplace context and master", () => {
    expect(
      shouldRenderBusinessOwnerHome({
        role: "CLIENT",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
    ).toBe(false);
    expect(
      shouldRenderBusinessOwnerHome({
        role: "PRO",
        partnerType: "MASTER",
        partnerActivities: ["MASTER"],
      }),
    ).toBe(false);
  });

  it("maps partner type for dashboard config", () => {
    expect(businessOwnerHomePartnerType({ partnerType: "STORE" })).toBe("STORE");
    expect(businessOwnerHomePartnerType({ partnerType: "COMPANY" })).toBe("COMPANY");
    expect(businessOwnerHomePartnerType({ partnerType: "MASTER" })).toBeNull();
  });
});
