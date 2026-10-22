export type SettlementsPageShell = "agent-r05" | "master-wallet" | "hub";

/** MASTER owner always uses the specialist wallet shell, even when R05 agent pilot is eligible. */
export function resolveSettlementsPageShell(input: {
  partnerType: string | null | undefined;
  r05Eligible: boolean;
}): SettlementsPageShell {
  if (input.partnerType === "MASTER") return "master-wallet";
  if (input.r05Eligible) return "agent-r05";
  return "hub";
}
