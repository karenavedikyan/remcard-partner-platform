import { mergeSettlementsResponses } from "@/lib/settlements-merge";
import type { FetchSettlementsOptions } from "@/lib/settlements-loader";
import type { SettlementsResponse } from "@/lib/settlements-types";
import {
  qaBranchScopedSettlements,
  qaOwnerAggregateSettlements,
  QaSettlementsForbiddenError,
} from "./company-wallet-fixtures";

class RemcardApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchSettlements(
  options?: FetchSettlementsOptions,
): Promise<SettlementsResponse> {
  const branchIds = normalizeBranchIds(options?.walletLedgerBranchIds);
  if (branchIds.length === 0) {
    return qaOwnerAggregateSettlements();
  }
  try {
    const chunks: SettlementsResponse[] = [];
    for (const branchId of branchIds) {
      chunks.push(qaBranchScopedSettlements(branchId));
    }
    return mergeSettlementsResponses(chunks);
  } catch (caught) {
    if (caught instanceof QaSettlementsForbiddenError) {
      throw new RemcardApiError(403, caught.message);
    }
    throw caught;
  }
}

function normalizeBranchIds(ids?: string[] | null): string[] {
  if (!ids?.length) return [];
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function isSettlementsAccessDenied(error: unknown): boolean {
  return error instanceof RemcardApiError && (error.status === 403 || error.status === 404);
}
