/** Actor-bound scope for personal wallet surfaces (agent, specialist, legacy hub). */
export function actorWalletSurfaceScopeKey(
  surface: "agent" | "specialist" | "legacy-settlements",
  actorUserId: string,
): string {
  const id = actorUserId.trim();
  if (!id) return `${surface}:anonymous`;
  return `${surface}:${id}`;
}

/** Cache/remount key for multi-branch staff wallet loads (actor + org scope + granted branches). */
export function walletSettlementsFetchScopeKey(
  baseScopeKey: string,
  walletLedgerBranchIds?: string[] | null,
): string {
  if (!walletLedgerBranchIds?.length) return baseScopeKey;
  const sorted = [
    ...new Set(walletLedgerBranchIds.map((id) => id.trim()).filter(Boolean)),
  ].sort();
  if (sorted.length === 0) return baseScopeKey;
  return `${baseScopeKey}:branches:${sorted.join(",")}`;
}
