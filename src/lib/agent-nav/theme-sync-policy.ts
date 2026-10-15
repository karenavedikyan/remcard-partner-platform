import type { ThemePreference } from "@/lib/theme-preference";

export function shouldPersistThemeToServer(
  pilotActive: boolean,
  hydrated: boolean,
  theme: ThemePreference,
  lastPersisted: ThemePreference | null,
): boolean {
  if (!pilotActive || !hydrated) return false;
  if (lastPersisted === null) return false;
  return theme !== lastPersisted;
}
