import type { SettlementsResponse } from "@/lib/settlements-types";
import { applyClientIncomingOnlySettlementsView } from "@/lib/wallet-accruals/settlements-display";

/** Read-only mini-app: never expose payout action tokens; strip on every row. */
export function stripSettlementPayoutActions(response: SettlementsResponse): SettlementsResponse {
  return {
    ...response,
    receivable: response.receivable.map((row) => ({ ...row, payoutActions: undefined })),
    payable: response.payable.map((row) => ({ ...row, payoutActions: undefined })),
    completed: response.completed.map((row) => ({ ...row, payoutActions: undefined })),
  };
}

export function sanitizeMiniAppWalletSettlements(
  response: SettlementsResponse,
  incomingOnly: boolean,
): SettlementsResponse {
  const withoutActions = stripSettlementPayoutActions(response);
  if (incomingOnly) {
    return applyClientIncomingOnlySettlementsView(withoutActions);
  }
  return withoutActions;
}