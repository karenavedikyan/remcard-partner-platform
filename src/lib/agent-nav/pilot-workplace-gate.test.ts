import { describe, expect, it } from "vitest";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import {
  companyOrgEmployeeContext,
  storeOrgEmployeeContext,
} from "@/lib/cabinet-presentation/test-fixtures";
import { shouldDeferPersonalAgentPilotForOrgWorkplace } from "./pilot-workplace-gate";
import {
  resolveActiveAgentRootRedirect,
  shouldUseAgentPilotCabinetShell,
} from "./root-destination";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";

const agentPilotPrefs = (): CabinetUiPreferencesResponse => ({
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "agent-wallet:actor",
  version: 1,
  theme: null,
  mobileNavKeys: ["certificates", "partners", "wallet", "profile"],
  permittedKeys: ["certificates", "clients", "partners", "wallet", "profile"],
  defaultMobileNavKeys: null,
});

describe("agent pilot vs org workplace", () => {
  it("defers pilot for ORG_TEAM_MEMBER and ORG_EMPLOYEE with org-context STORE/COMPANY", () => {
    const storeEmployee = cabinetPresentationFixture(
      {
        id: "staff-store",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: ["AGENT"],
      } satisfies AuthUser,
      storeOrgEmployeeContext,
    );
    expect(shouldDeferPersonalAgentPilotForOrgWorkplace(storeEmployee)).toBe(true);
    expect(
      resolveActiveAgentRootRedirect(agentPilotPrefs(), {
        prefsLoadOk: true,
        presentation: storeEmployee,
      }),
    ).toBe(null);
    expect(shouldUseAgentPilotCabinetShell(agentPilotPrefs(), storeEmployee)).toBe(false);

    const companyMember = cabinetPresentationFixture(
      {
        id: "staff-co",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
      } satisfies AuthUser,
      companyOrgEmployeeContext,
    );
    expect(shouldDeferPersonalAgentPilotForOrgWorkplace(companyMember)).toBe(true);
    expect(shouldUseAgentPilotCabinetShell(agentPilotPrefs(), companyMember)).toBe(false);
  });

  it("keeps solo personal agent pilot when workplace is not org-context", () => {
    const soloAgent = cabinetPresentationFixture({
      id: "solo-agent",
      role: "PRO",
      partnerType: "AGENT",
      partnerActivities: ["AGENT"],
    } satisfies AuthUser);
    expect(shouldDeferPersonalAgentPilotForOrgWorkplace(soloAgent)).toBe(false);
    expect(
      resolveActiveAgentRootRedirect(agentPilotPrefs(), {
        prefsLoadOk: true,
        presentation: soloAgent,
      }),
    ).toBe("/certificates");
    expect(shouldUseAgentPilotCabinetShell(agentPilotPrefs(), soloAgent)).toBe(true);
  });
});
