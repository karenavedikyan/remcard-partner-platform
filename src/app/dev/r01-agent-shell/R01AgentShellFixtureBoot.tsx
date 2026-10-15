"use client";

import { useEffect } from "react";
import {
  applyDataTheme,
  writeStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";

export function R01AgentShellFixtureBoot({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    writeStoredThemePreference(theme);
    applyDataTheme(theme);
  }, [theme]);
  return null;
}
