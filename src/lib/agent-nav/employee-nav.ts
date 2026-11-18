import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { defaultAgentMobileNavKeys, type AgentNavSectionKey } from "@/lib/agent-nav/sections";

/** Sections of the agent cabinet, in the order of the agent shell (certificates first). */
const EMPLOYEE_AGENT_KEYS: AgentNavSectionKey[] = [
  "certificates",
  "clients",
  "partners",
  "wallet",
  "profile",
];

/**
 * Menu of an employee of an agent: the same sections as the owner, narrowed by the rights the owner
 * saved for the employee when those flags are present. Page-level guards still apply on every route.
 */
export function agentEmployeePermittedKeys(
  proContext: ProContextSnapshot | null | undefined,
): AgentNavSectionKey[] {
  const flags = proContext?.rights?.flags ?? proContext?.effectivePermissions ?? null;
  if (!flags) return [...EMPLOYEE_AGENT_KEYS];
  const allowed: Record<AgentNavSectionKey, boolean> = {
    home: true,
    certificates: Boolean(flags.canManageCertificates || flags.canActivateCertificates),
    clients: Boolean(flags.canManageLeads),
    partners: Boolean(flags.canManagePartnerships || flags.canManageCrossRequests),
    wallet: Boolean(flags.canViewWallet || flags.canViewOwnOperations),
    recommendations: false,
    scanner: false,
    history: false,
    notifications: false,
    profile: true,
  };
  return EMPLOYEE_AGENT_KEYS.filter((key) => allowed[key]);
}

/** Fixed (non-persisted) prefs for the agent shell of an employee: no personal bottom-bar editor, no theme sync. */
export function agentEmployeeUiPrefs(
  proContext: ProContextSnapshot | null | undefined,
): CabinetUiPreferencesResponse {
  const permittedKeys = agentEmployeePermittedKeys(proContext);
  return {
    contractVersion: "employee-fixed",
    pilotEnabled: false,
    pilotActive: false,
    contextKey: null,
    version: 0,
    theme: null,
    mobileNavKeys: defaultAgentMobileNavKeys(permittedKeys),
    permittedKeys,
    defaultMobileNavKeys: defaultAgentMobileNavKeys(permittedKeys),
  };
}

/** The shell for employees of an agent (owners get theirs from server prefs). */
export function shouldUseAgentEmployeeShell(input: {
  navMode: string;
  workplaceKindSource?: string | null;
}): boolean {
  return input.navMode === "agent" && input.workplaceKindSource === "employer-context";
}
