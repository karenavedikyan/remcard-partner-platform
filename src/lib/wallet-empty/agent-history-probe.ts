import type { AgentReceivablesMeta, AgentReceivablesOverview } from "@/lib/agent-r05/api";

/** Unfiltered global history cardinality probe (not user list filters). */
export function buildAgentReceivablesHistoryProbeParams(): URLSearchParams {
  const params = new URLSearchParams();
  params.set("status", "all");
  params.set("page", "1");
  params.set("pageSize", "1");
  params.set("sort", "date-desc");
  return params;
}

export function parseAgentHistoryTotalRecords(
  meta: AgentReceivablesMeta | null | undefined,
): number | null {
  if (!meta || typeof meta.totalRecords !== "number" || !Number.isFinite(meta.totalRecords)) {
    return null;
  }
  return meta.totalRecords;
}

export function isAgentOverviewSignalsEmpty(overview: AgentReceivablesOverview): boolean {
  return (
    overview.confirmedTotalKopecks === 0 &&
    (overview.pendingTotalKopecks ?? 0) === 0 &&
    (overview.suspendedTotalKopecks ?? 0) === 0 &&
    overview.openCount === 0 &&
    overview.pendingCount === 0 &&
    overview.coverage.needsReviewCount === 0
  );
}

export function canShowAgentWalletEmptyState(input: {
  overview: AgentReceivablesOverview | null;
  historyTotalRecords: number | null;
  historyProbeFailed: boolean;
  loading: boolean;
}): boolean {
  if (input.loading || input.historyProbeFailed) return false;
  if (!input.overview || input.historyTotalRecords === null) return false;
  if (!isAgentOverviewSignalsEmpty(input.overview)) return false;
  return input.historyTotalRecords === 0;
}
