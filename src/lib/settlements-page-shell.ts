import { resolveCabinetNavMode } from "@/lib/cabinet-nav/mode";
import type { AuthUser } from "@/lib/types";

export type SettlementsPageShell = "agent-r05" | "master-wallet" | "hub";

/** MASTER owner always uses the specialist wallet shell, even when R05 agent pilot is eligible. */
export function resolveSettlementsPageShell(input: {
  partnerType: string | null | undefined;
  partnerActivities?: string[] | null;
  role?: string | null;
  r05Eligible: boolean;
}): SettlementsPageShell {
  if (input.partnerType === "MASTER") return "master-wallet";
  const mode = resolveCabinetNavMode({
    partnerType: input.partnerType,
    role: input.role ?? "PRO",
    partnerActivities: input.partnerActivities ?? [],
  });
  if (mode === "business-store" || mode === "business-company") return "master-wallet";
  if (input.r05Eligible) return "agent-r05";
  return "hub";
}

export function businessWalletPartnerTypeFromUser(
  user: Pick<AuthUser, "partnerType">,
): "STORE" | "COMPANY" | null {
  if (user.partnerType === "STORE") return "STORE";
  if (user.partnerType === "COMPANY") return "COMPANY";
  return null;
}
