import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { AuthUser } from "@/lib/types";

export type CabinetNavMode = "legacy" | "master" | "business-store" | "business-company";

export function resolveCabinetNavMode(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
): CabinetNavMode {
  if (user.partnerType === "MASTER") return "master";
  if (user.role !== "PRO") return "legacy";
  if (isPureAgentActivities(user.partnerActivities)) return "legacy";
  if (user.partnerType === "STORE") return "business-store";
  if (user.partnerType === "COMPANY") return "business-company";
  return "legacy";
}

export function usesCabinetPrototypeShell(mode: CabinetNavMode): boolean {
  return mode === "master" || mode === "business-store" || mode === "business-company";
}
