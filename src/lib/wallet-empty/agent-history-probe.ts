import type { AgentReceivablesMeta, AgentReceivablesOverview } from "@/lib/agent-r05/api";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchAgentReceivablePartners,
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";

/**
 * Unfiltered global partner-group cardinality probe (not user list filters).
 * BE: GET /partners with status=all — meta.totalRecords = total partner groups globally.
 */
export function buildAgentReceivablesHistoryProbeParams(): URLSearchParams {
  const params = new URLSearchParams();
  params.set("status", "all");
  params.set("page", "1");
  params.set("pageSize", "25");
  params.set("sort", "name");
  return params;
}

/** True when params match the fixed history probe (distinct from hub partner list filters). */
export function isAgentReceivablesHistoryProbeParams(params: URLSearchParams): boolean {
  return (
    params.get("status") === "all" &&
    params.get("page") === "1" &&
    params.get("pageSize") === "25" &&
    params.get("sort") === "name" &&
    !params.get("q") &&
    !params.get("from") &&
    !params.get("to") &&
    !params.get("partnerId") &&
    !params.get("groupKey") &&
    !params.get("partnerGroupKey")
  );
}

/**
 * Parses meta.totalRecords from partners probe as non-negative integer group count only.
 * Not order cardinality; never shown in UI copy.
 */
export function parseAgentHistoryGroupCount(
  meta: AgentReceivablesMeta | null | undefined,
): number | null {
  if (!meta || typeof meta.totalRecords !== "number") {
    return null;
  }
  const n = meta.totalRecords;
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

/** @deprecated Prefer parseAgentHistoryGroupCount — same semantics (partner groups, not orders). */
export const parseAgentHistoryTotalRecords = parseAgentHistoryGroupCount;

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
  /** Partner-group count from history probe (0 = no agent history). */
  historyTotalRecords: number | null;
  historyProbeFailed: boolean;
  loading: boolean;
}): boolean {
  if (input.loading || input.historyProbeFailed) return false;
  if (!input.overview || input.historyTotalRecords === null) return false;
  if (!isAgentOverviewSignalsEmpty(input.overview)) return false;
  return input.historyTotalRecords === 0;
}

export type AgentReceivablesEmptyGateSignals = {
  overview: AgentReceivablesOverview | null;
  /** Partner-group count from probe meta.totalRecords (not orders). */
  historyTotalRecords: number | null;
  historyProbeFailed: boolean;
  error: string;
};

/** Shared overview + unfiltered partners history probe (hub + wallet entry gate). */
export async function fetchAgentReceivablesEmptyGateSignals(): Promise<AgentReceivablesEmptyGateSignals> {
  const probeParams = buildAgentReceivablesHistoryProbeParams();
  const [overviewResult, probeResult] = await Promise.allSettled([
    fetchAgentReceivablesOverview(),
    fetchAgentReceivablePartners(probeParams),
  ]);

  if (overviewResult.status === "rejected") {
    const caught = overviewResult.reason;
    return {
      overview: null,
      historyTotalRecords: null,
      historyProbeFailed: false,
      error: caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить кошелёк",
    };
  }

  const overview = overviewResult.value;
  let historyTotalRecords: number | null = null;
  let historyProbeFailed = false;

  if (probeResult.status === "rejected") {
    historyProbeFailed = true;
  } else if (!probeResult.value?.meta) {
    historyProbeFailed = true;
  } else {
    const groupCount = parseAgentHistoryGroupCount(probeResult.value.meta);
    if (groupCount === null) {
      historyProbeFailed = true;
    } else {
      historyTotalRecords = groupCount;
    }
  }

  return {
    overview,
    historyTotalRecords,
    historyProbeFailed,
    error: "",
  };
}
