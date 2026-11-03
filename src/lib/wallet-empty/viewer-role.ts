import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { SettlementsPageShell } from "@/lib/settlements-page-shell";
import type { CabinetNavMode } from "@/lib/cabinet-nav/mode";
import type { WalletEmptyAudienceRole } from "./types";

export type WalletEmptyViewerRole = WalletEmptyAudienceRole;

/** Explicit prop contract for wallet-owned empty onboarding (passed from settlements page). */
export type WalletEmptyViewerProps = {
  walletEmptyViewerRole: WalletEmptyViewerRole;
};

export function resolveWalletEmptyViewerRole(input: {
  partnerType: string | null | undefined;
  partnerActivities?: string[] | null;
  shell: SettlementsPageShell;
  navMode: CabinetNavMode;
}): WalletEmptyViewerRole | null {
  if (input.shell === "agent-r05") return "agent";
  if (input.navMode === "business-store" || input.partnerType === "STORE") return "store";
  if (input.navMode === "business-company" || input.partnerType === "COMPANY") return "company";
  if (input.shell === "master-wallet" || input.partnerType === "MASTER") return "specialist";
  if (input.shell === "hub") {
    const activities = input.partnerActivities ?? [];
    if (isPureAgentActivities(activities) || activities.includes("AGENT")) return "agent";
    if (input.partnerType === "STORE") return "store";
    if (input.partnerType === "COMPANY") return "company";
    return "specialist";
  }
  return null;
}

export function isSupportedWalletEmptyViewerRole(
  role: WalletEmptyViewerRole | null | undefined,
): role is WalletEmptyViewerRole {
  return role === "agent" || role === "specialist" || role === "store" || role === "company";
}
