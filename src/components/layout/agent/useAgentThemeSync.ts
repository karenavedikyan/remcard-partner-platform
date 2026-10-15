"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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
  const queuedTheme = useRef<ThemePreference | null>(null);
  const lastUserTheme = useRef<ThemePreference | null>(null);

  const flushPersist = () => {
    if (inFlight.current) return;
    const target = queuedTheme.current;
    if (target === null) return;
    queuedTheme.current = null;
    if (target === lastPersisted.current) return;

    inFlight.current = true;
    const previous = lastPersisted.current;
    persistRef
      .current(target)
      .then(() => {
        lastPersisted.current = target;
      })
      .catch(() => {
        lastPersisted.current = previous;
      })
      .finally(() => {
        inFlight.current = false;
        flushPersist();
      });
  };

  const queuePersist = (target: ThemePreference) => {
    queuedTheme.current = target;
    flushPersist();
  };

  useEffect(() => {
    if (!pilotActive) {
      hydrated.current = false;
      lastPersisted.current = null;
      lastUserTheme.current = null;
      queuedTheme.current = null;
      return;
    }
    if (!serverTheme || !isThemePreference(serverTheme)) return;

    hydrated.current = false;
    lastPersisted.current = serverTheme;
    writeStoredThemePreference(serverTheme);
    applyDataTheme(serverTheme);
    setTheme(serverTheme);
  }, [pilotActive, serverTheme, setTheme]);

  useEffect(() => {
    if (!pilotActive) return;

    if (!hydrated.current && lastPersisted.current !== null) {
      if (theme === lastPersisted.current) {
        hydrated.current = true;
        lastUserTheme.current = theme;
      }
      return;
    }

    if (!hydrated.current) return;
    if (lastUserTheme.current === theme) return;
    lastUserTheme.current = theme;
    queuePersist(theme);
  }, [pilotActive, theme]);
}
