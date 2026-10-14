"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyDataTheme,
  isThemePreference,
  writeStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";

/** Hydrate theme from server prefs and persist toggles back when pilot is active. */
export function useAgentThemeSync(
  pilotActive: boolean,
  serverTheme: ThemePreference | null,
  persistTheme: (theme: ThemePreference) => Promise<unknown>,
) {
  const { theme, setTheme } = useTheme();
  const hydrated = useRef(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    if (!pilotActive || !serverTheme || !isThemePreference(serverTheme)) return;
    if (hydrated.current) return;
    hydrated.current = true;
    skipNextPersist.current = true;
    writeStoredThemePreference(serverTheme);
    applyDataTheme(serverTheme);
    setTheme(serverTheme);
  }, [pilotActive, serverTheme, setTheme]);

  useEffect(() => {
    if (!pilotActive) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (!hydrated.current) return;
    void persistTheme(theme);
  }, [pilotActive, persistTheme, theme]);
}
