import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

/** Non-pilot shell fallback when prefs cannot be loaded (auth failure or missing data). */
export const neutralCabinetUiPreferencesFallback: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: false,
  pilotActive: false,
  contextKey: null,
  version: 0,
  theme: null,
  mobileNavKeys: null,
  permittedKeys: null,
  defaultMobileNavKeys: null,
};
