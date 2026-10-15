"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { shouldPersistThemeToServer } from "@/lib/agent-nav/theme-sync-policy";
import {
  applyDataTheme,
  isThemePreference,
  writeStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";

type PersistThemeFn = (theme: ThemePreference) => Promise<unknown>;

/** Hydrate theme from server prefs; persist only on explicit user theme changes. */
export function useAgentThemeSync(
  pilotActive: boolean,
  serverTheme: ThemePreference | null,
  persistTheme: PersistThemeFn,
) {
  const { theme, setTheme } = useTheme();
  const hydrated = useRef(false);
  const lastPersisted = useRef<ThemePreference | null>(null);
  const persistRef = useRef(persistTheme);
  persistRef.current = persistTheme;
  const inFlight = useRef(false);

  useEffect(() => {
    if (!pilotActive) {
      hydrated.current = false;
      lastPersisted.current = null;
      return;
    }
    if (!serverTheme || !isThemePreference(serverTheme)) return;
    hydrated.current = true;
    lastPersisted.current = serverTheme;
    writeStoredThemePreference(serverTheme);
    applyDataTheme(serverTheme);
    setTheme(serverTheme);
  }, [pilotActive, serverTheme, setTheme]);

  useEffect(() => {
    if (
      !shouldPersistThemeToServer(pilotActive, hydrated.current, theme, lastPersisted.current)
    ) {
      return;
    }
    if (inFlight.current) return;
    const previous = lastPersisted.current;
    inFlight.current = true;
    persistRef
      .current(theme)
      .then(() => {
        lastPersisted.current = theme;
      })
      .catch(() => {
        lastPersisted.current = previous;
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [pilotActive, theme]);
}
