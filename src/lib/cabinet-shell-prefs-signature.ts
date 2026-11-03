import {
  enrichCabinetUiPreferencesForShell,
  isActiveAgentCabinetContext,
} from "@/lib/agent-nav/root-destination";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

/** Layout branch identity for prefs refresh (pilot shell vs legacy; agent contextKey). */
export function cabinetShellPrefsLayoutSignature(
  prefs: CabinetUiPreferencesResponse,
): string {
  const enriched = enrichCabinetUiPreferencesForShell(prefs);
  const branch = isActiveAgentCabinetContext(enriched) ? "agent" : "legacy";
  return `${branch}:${enriched.contextKey ?? "none"}`;
}
