import { describe, expect, it } from "vitest";
import {
  agentEmployeePermittedKeys,
  agentEmployeeUiPrefs,
  shouldUseAgentEmployeeShell,
} from "./employee-nav";
import { agentEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

const noFlags = {
  canManageLeads: false,
  canManageCertificates: false,
  canActivateCertificates: false,
  canViewOwnOperations: false,
  canViewWallet: false,
  canPayBonusCash: false,
  canPayBonusTransfer: false,
  canManageCatalog: false,
  canManagePartnerships: false,
  canManageEmployees: false,
  canManageCrossRequests: false,
};

describe("agent employee menu", () => {
  it("is the agent menu: certificates, clients, partners, wallet, profile — no settlements hub, no home", () => {
    const keys = agentEmployeePermittedKeys(agentEmployeeContext);
    expect(keys).toEqual(["certificates", "clients", "partners", "wallet", "profile"]);
  });

  it("is narrowed by the rights saved for the employee", () => {
    const issuer: ProContextSnapshot = {
      ...agentEmployeeContext,
      rights: { role: "SELLER", flags: { ...noFlags, canManageCertificates: true, canViewOwnOperations: true } },
    };
    expect(agentEmployeePermittedKeys(issuer)).toEqual(["certificates", "wallet", "profile"]);
  });

  it("fixed prefs: no pilot, no persistence, bottom bar from the permitted keys", () => {
    const prefs = agentEmployeeUiPrefs(agentEmployeeContext);
    expect(prefs.pilotActive).toBe(false);
    expect(prefs.contextKey).toBeNull();
    expect(prefs.mobileNavKeys).toEqual(["certificates", "partners", "wallet", "profile"]);
  });

  it("only employees of an agent use it", () => {
    expect(shouldUseAgentEmployeeShell({ navMode: "agent", workplaceKindSource: "employer-context" })).toBe(true);
    expect(shouldUseAgentEmployeeShell({ navMode: "agent", workplaceKindSource: "personal-profile" })).toBe(false);
    expect(shouldUseAgentEmployeeShell({ navMode: "master", workplaceKindSource: "employer-context" })).toBe(false);
  });
});
