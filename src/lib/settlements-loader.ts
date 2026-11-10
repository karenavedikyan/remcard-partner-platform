import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { publicSettlementsCoverageNote } from "@/lib/wallet-accruals/settlements-display";
import { mergeSettlementsResponses } from "./settlements-merge";
import type { SettlementsResponse } from "./settlements-types";

export type FetchSettlementsOptions = {
  /** Org staff: fetch each granted branch via ?branchId= and merge. Omit for owner/solo aggregate GET. */
  walletLedgerBranchIds?: string[] | null;
};

export async function fetchSettlements(
  options?: FetchSettlementsOptions,
): Promise<SettlementsResponse> {
  if (options && "walletLedgerBranchIds" in options) {
    const branchIds = normalizeBranchIds(options.walletLedgerBranchIds);
    if (branchIds.length === 0) {
      throw new RemcardApiError(403, "Нет филиалов для просмотра расчётов.");
    }
    return fetchSettlementsForGrantedBranches(branchIds);
  }
  return remcardFetch<SettlementsResponse>("/api/pro/wallet/settlements");
}

function normalizeBranchIds(ids?: string[] | null): string[] {
  if (!ids?.length) return [];
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

function staffBranchMergedCoverageNote(branchCount: number, upstreamNote: string): string {
  const scope = `Показаны расчёты по филиалам с правом просмотра (${branchCount}).`;
  const caveat =
    "Исторические начисления без привязки к филиалу не включены. Итог может отличаться от общего баланса владельца.";
  const publicUpstream = publicSettlementsCoverageNote(upstreamNote);
  return [scope, caveat, publicUpstream].filter(Boolean).join(" ");
}

async function fetchSettlementsForGrantedBranches(
  branchIds: string[],
): Promise<SettlementsResponse> {
  const responses = await Promise.all(
    branchIds.map((branchId) => fetchSettlementsForBranch(branchId)),
  );
  const merged = mergeSettlementsResponses(responses);
  return {
    ...merged,
    coverageNote: staffBranchMergedCoverageNote(branchIds.length, merged.coverageNote),
  };
}

async function fetchSettlementsForBranch(branchId: string): Promise<SettlementsResponse> {
  const qs = new URLSearchParams({ branchId });
  return remcardFetch<SettlementsResponse>(`/api/pro/wallet/settlements?${qs.toString()}`);
}

export { mergeSettlementsResponses } from "./settlements-merge";

export function isSettlementsAccessDenied(error: unknown): boolean {
  return error instanceof RemcardApiError && (error.status === 403 || error.status === 404);
}
