import type { SettlementsResponse } from "@/lib/settlements-types";
import type { WalletAccrualsData } from "@/lib/wallet-accruals/types";

/** Hide internal R05 debug copy from user-facing wallet chrome. */
export function publicSettlementsCoverageNote(note: string | undefined | null): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;
  if (/^R05\s*:/i.test(trimmed)) return null;
  return trimmed;
}

/** Client-side incoming-only view: hide forbidden directions/actions even if server sends wider payload. */
export function applyClientIncomingOnlySettlementsView(
  response: SettlementsResponse,
): SettlementsResponse {
  return {
    ...response,
    payable: [],
    receivable: response.receivable.map((row) => ({
      ...row,
      payoutActions: undefined,
    })),
    completed: response.completed.filter((row) => row.direction !== "payable"),
  };
}

export function toAccrualsData(response: SettlementsResponse): WalletAccrualsData {
  return {
    receivable: response.receivable,
    payable: response.payable,
    completed: response.completed,
  };
}
