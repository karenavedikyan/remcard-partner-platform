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

/** SSR + first client render: fixed placeholder; boot script owns `data-theme` until hydrate. */
const INITIAL_RESOLVED_THEME: "light" | "dark" = "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(INITIAL_RESOLVED_THEME);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = readStoredThemePreference();
    setThemeState(stored);
    setResolvedTheme(applyDataTheme(stored));

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    if (!media) return;

    const onSystemChange = () => {
      setThemeState((current) => {
        if (current !== "system") return current;
        setResolvedTheme(applyDataTheme("system"));
        return current;
      });
    };

    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    writeStoredThemePreference(next);
    setResolvedTheme(applyDataTheme(next));
  }, []);

  const toggleLightDark = useCallback(() => {
    setThemeState((current) => {
      const prefersDark =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved = resolveDataTheme(current, prefersDark);
      const explicit: ThemePreference = resolved === "dark" ? "light" : "dark";
      writeStoredThemePreference(explicit);
      setResolvedTheme(applyDataTheme(explicit));
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
