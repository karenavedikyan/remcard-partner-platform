import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

export type CabinetUiPrefsApplySource = "patch" | "get" | "initial";

export function shouldApplyIncomingCabinetUiPrefs(
  currentVersion: number,
  incoming: CabinetUiPreferencesResponse,
  saveInFlightCount: number,
  source: CabinetUiPrefsApplySource,
): boolean {
  if (source === "patch") return true;
  if (saveInFlightCount > 0) return false;
  return incoming.version >= currentVersion;
}
