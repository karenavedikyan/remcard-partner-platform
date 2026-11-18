import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { AuthUser } from "@/lib/types";

export type CabinetNavMode =
  | "legacy"
  | "master"
  | "agent"
  | "business-store"
  | "business-company";

export type ResolveCabinetNavModeOptions = {
  /** Trusted workplace type from GET /api/pro/context (org staff) or owner profile. */
  workplacePartnerType?: "STORE" | "COMPANY" | null;
  /** When true, org workplace nav wins over personal MASTER / pure-agent legacy. */
  workplaceNavFromOrgContext?: boolean;
  /**
   * Employee of a specialist / agent (no organization): kind of the employer from trusted
   * GET /api/pro/context. Wins over the employee's own personal profile.
   */
  employerWorkplaceKind?: "MASTER" | "AGENT" | null;
};

export function resolveCabinetNavMode(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
  options?: ResolveCabinetNavModeOptions,
): CabinetNavMode {
  const workplace = options?.workplacePartnerType ?? null;
  if (options?.workplaceNavFromOrgContext && workplace === "STORE") return "business-store";
  if (options?.workplaceNavFromOrgContext && workplace === "COMPANY") return "business-company";

  const employerKind = options?.employerWorkplaceKind ?? null;
  if (employerKind === "MASTER") return "master";
  if (employerKind === "AGENT") return "agent";

  if (user.partnerType === "MASTER") return "master";
  if (user.role === "PRO") {
    if (isPureAgentActivities(user.partnerActivities)) return "agent";
    if (user.partnerType === "STORE") return "business-store";
    if (user.partnerType === "COMPANY") return "business-company";
  }
  if (workplace === "STORE") return "business-store";
  if (workplace === "COMPANY") return "business-company";
  return "legacy";
}

export function usesCabinetPrototypeShell(mode: CabinetNavMode): boolean {
  return mode === "master" || mode === "business-store" || mode === "business-company";
}

export function usesAgentCabinetShell(mode: CabinetNavMode): boolean {
  return mode === "agent";
}
