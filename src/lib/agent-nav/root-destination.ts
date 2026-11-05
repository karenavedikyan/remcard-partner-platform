import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { defaultAgentMobileNavKeys } from "@/lib/agent-nav/sections";
import {
  shouldDeferPersonalAgentPilotForOrgWorkplace,
  type AgentPilotPresentationScope,
} from "@/lib/agent-nav/pilot-workplace-gate";

/** Same enrichment as CabinetShell before AgentAppShell. */
export function enrichCabinetUiPreferencesForShell(
  loaded: CabinetUiPreferencesResponse,
): CabinetUiPreferencesResponse {
  if (
    loaded.pilotActive &&
    (!loaded.mobileNavKeys || loaded.mobileNavKeys.length === 0) &&
    loaded.permittedKeys
  ) {
    return {
      ...loaded,
      mobileNavKeys: defaultAgentMobileNavKeys(loaded.permittedKeys),
    };
  }
  return loaded;
}

/** Matches CabinetAppShellClient agent branch (pilot + keys + mobile nav). */
export function isActiveAgentCabinetContext(prefs: CabinetUiPreferencesResponse): boolean {
  return Boolean(prefs.pilotActive && prefs.permittedKeys && prefs.mobileNavKeys);
}

export function shouldUseAgentPilotCabinetShell(
  prefs: CabinetUiPreferencesResponse,
  presentation: AgentPilotPresentationScope,
): boolean {
  if (shouldDeferPersonalAgentPilotForOrgWorkplace(presentation)) {
    return false;
  }
  const enriched = enrichCabinetUiPreferencesForShell(prefs);
  return isActiveAgentCabinetContext(enriched);
}

/**
 * Server redirect target for `/` when the active agent cabinet applies.
 * Fail-closed: no redirect unless prefs loaded and certificates is permitted.
 */
export function resolveActiveAgentRootRedirect(
  prefs: CabinetUiPreferencesResponse | null | undefined,
  options: { prefsLoadOk: boolean; presentation?: AgentPilotPresentationScope | null },
): "/certificates" | null {
  if (!options.prefsLoadOk || !prefs) return null;
  if (options.presentation && shouldDeferPersonalAgentPilotForOrgWorkplace(options.presentation)) {
    return null;
  }
  const enriched = enrichCabinetUiPreferencesForShell(prefs);
  if (!isActiveAgentCabinetContext(enriched)) return null;
  if (!enriched.permittedKeys?.includes("certificates")) return null;
  return "/certificates";
}
