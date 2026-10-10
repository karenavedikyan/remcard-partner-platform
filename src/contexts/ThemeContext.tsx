"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDataTheme,
  readStoredThemePreference,
  resolveDataTheme,
  type ThemePreference,
  writeStoredThemePreference,
} from "@/lib/theme-preference";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
  toggleLightDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialResolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(readInitialResolvedTheme);

  useEffect(() => {
    setThemeState(readStoredThemePreference());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      const resolved = applyDataTheme(theme);
      setResolvedTheme(resolved);
    };

    sync();
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    if (!media) return;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    writeStoredThemePreference(next);
  }, []);

  const toggleLightDark = useCallback(() => {
    setThemeState((current) => {
      const prefersDark =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved = resolveDataTheme(current, prefersDark);
      const explicit: ThemePreference = resolved === "dark" ? "light" : "dark";
      writeStoredThemePreference(explicit);
      return explicit;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleLightDark }),
    [theme, resolvedTheme, setTheme, toggleLightDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
