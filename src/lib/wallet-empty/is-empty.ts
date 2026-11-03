import type { AgentReceivablesOverview } from "@/lib/agent-r05/api";
import type { SettlementsResponse } from "@/lib/settlements-types";
import { isAgentOverviewSignalsEmpty } from "./agent-history-probe";

/** True only when the wallet API succeeded and there is no settlement history at all. */
export function isWalletSettlementsDataEmpty(data: SettlementsResponse): boolean {
  return (
    data.receivable.length === 0 &&
    data.payable.length === 0 &&
    data.completed.length === 0
  );
}

/** Overview-only signal; agent empty state also requires history probe totalRecords === 0. */
export function isAgentReceivablesOverviewEmpty(overview: AgentReceivablesOverview): boolean {
  return isAgentOverviewSignalsEmpty(overview);
}
