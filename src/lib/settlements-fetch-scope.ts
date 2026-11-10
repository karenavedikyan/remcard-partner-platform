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
