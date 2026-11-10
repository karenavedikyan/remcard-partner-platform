import { RemcardApiError, remcardFetch } from "@/lib/api-client";
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

function staffBranchMergedCoverageNote(branchIds: string[], upstreamNote: string): string {
  const scope = `По филиалам с правом просмотра: ${branchIds.join(", ")}.`;
  const caveat =
    "Начисления без привязки к филиалу (исторические) в этот обзор не входят и могут отличаться от кошелька владельца.";
  const base = upstreamNote.trim();
  return [scope, caveat, base].filter(Boolean).join(" ");
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
    coverageNote: staffBranchMergedCoverageNote(branchIds, merged.coverageNote),
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
