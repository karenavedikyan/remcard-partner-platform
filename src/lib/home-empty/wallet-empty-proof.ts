import type { WalletBalanceResponse } from "@/lib/history-types";

export type WalletEmptyProof = "empty" | "not_empty" | "unknown";

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function requiredZero(value: unknown): boolean {
  return finiteNumber(value) && value === 0;
}

/** Optional wallet fields may be absent; if present they must be numeric zero. */
function optionalZeroOrAbsent(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return requiredZero(value);
}

/** Proves MASTER wallet has no accruals; malformed payloads cannot establish empty. */
export function specialistWalletEmptyProof(
  wallet: WalletBalanceResponse | null,
  walletError: string | null,
): WalletEmptyProof {
  if (walletError) return "unknown";
  if (!wallet || typeof wallet !== "object") return "unknown";
  if (wallet.role !== "MASTER") return "unknown";

  if (
    !finiteNumber(wallet.totalRub) ||
    !finiteNumber(wallet.paidRub) ||
    !finiteNumber(wallet.pendingRub) ||
    !finiteNumber(wallet.count)
  ) {
    return "unknown";
  }

  if (
    wallet.totalRub !== 0 ||
    wallet.paidRub !== 0 ||
    wallet.pendingRub !== 0 ||
    wallet.count !== 0
  ) {
    return "not_empty";
  }

  if (
    !optionalZeroOrAbsent(wallet.awaitingRub) ||
    !optionalZeroOrAbsent(wallet.suspendedRub) ||
    !optionalZeroOrAbsent(wallet.balanceRub)
  ) {
    return "not_empty";
  }

  return "empty";
}

export const EMPTY_MASTER_WALLET_FIXTURE: WalletBalanceResponse = {
  role: "MASTER",
  totalRub: 0,
  paidRub: 0,
  pendingRub: 0,
  count: 0,
};
