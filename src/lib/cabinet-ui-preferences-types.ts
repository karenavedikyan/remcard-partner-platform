import type { AgentNavSectionKey } from "@/lib/agent-nav/sections";
import type { ThemePreference } from "@/lib/theme-preference";

export type CabinetUiPreferencesResponse = {
  contractVersion: string;
  pilotEnabled: boolean;
  pilotActive: boolean;
  contextKey: string | null;
  version: number;
  theme: ThemePreference | null;
  mobileNavKeys: AgentNavSectionKey[] | null;
  permittedKeys: AgentNavSectionKey[] | null;
  defaultMobileNavKeys: AgentNavSectionKey[] | null;
};

export function isCabinetUiPreferencesResponse(
  value: unknown,
): value is CabinetUiPreferencesResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.pilotActive === "boolean" && typeof v.pilotEnabled === "boolean";
}
