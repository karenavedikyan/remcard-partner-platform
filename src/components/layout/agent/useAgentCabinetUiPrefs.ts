"use client";

import { useCallback, useState } from "react";
import { remcardFetch } from "@/lib/api-client";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AgentNavSectionKey } from "@/lib/agent-nav/sections";
import type { ThemePreference } from "@/lib/theme-preference";

export function useAgentCabinetUiPrefs(initial: CabinetUiPreferencesResponse) {
  const [prefs, setPrefs] = useState(initial);

  const saveMobileNavKeys = useCallback(
    async (mobileNavKeys: AgentNavSectionKey[]) => {
      const next = await remcardFetch<CabinetUiPreferencesResponse>(
        "/api/pro/cabinet-ui-preferences",
        {
          method: "PATCH",
          body: { mobileNavKeys, expectedVersion: prefs.version },
        },
      );
      setPrefs(next);
      return next;
    },
    [prefs.version],
  );

  const saveTheme = useCallback(
    async (theme: ThemePreference) => {
      const next = await remcardFetch<CabinetUiPreferencesResponse>(
        "/api/pro/cabinet-ui-preferences",
        {
          method: "PATCH",
          body: { theme, expectedVersion: prefs.version },
        },
      );
      setPrefs(next);
      return next;
    },
    [prefs.version],
  );

  return { prefs, setPrefs, saveMobileNavKeys, saveTheme };
}
