import { describe, expect, it } from "vitest";
import {
  buildAgentReceivablesHistoryProbeParams,
  canShowAgentWalletEmptyState,
  isAgentOverviewSignalsEmpty,
  parseAgentHistoryTotalRecords,
} from "./agent-history-probe";

describe("buildAgentReceivablesHistoryProbeParams", () => {
  it("requests unfiltered global history page", () => {
    const params = buildAgentReceivablesHistoryProbeParams();
    expect(params.get("status")).toBe("all");
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("1");
    expect(params.get("q")).toBeNull();
  });
});

describe("parseAgentHistoryTotalRecords", () => {
  it("returns null when meta is missing or invalid", () => {
    expect(parseAgentHistoryTotalRecords(null)).toBeNull();
    expect(parseAgentHistoryTotalRecords(undefined)).toBeNull();
    expect(parseAgentHistoryTotalRecords({} as never)).toBeNull();
  });
});

describe("canShowAgentWalletEmptyState", () => {
  const emptyOverview = {
    contractVersion: "1",
    confirmedTotalKopecks: 0,
    openCount: 0,
    pendingCount: 0,
    coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
  };

  it("requires overview signals empty and history total zero", () => {
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: 0,
        historyProbeFailed: false,
        loading: false,
      }),
    ).toBe(true);
  });

  it("does not treat overview zero alone as empty when history has rows", () => {
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: 3,
        historyProbeFailed: false,
        loading: false,
      }),
    ).toBe(false);
  });

  it("blocks empty on probe failure, loading, or unknown totals", () => {
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: null,
        historyProbeFailed: false,
        loading: false,
      }),
    ).toBe(false);
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: 0,
        historyProbeFailed: true,
        loading: false,
      }),
    ).toBe(false);
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: 0,
        historyProbeFailed: false,
        loading: true,
      }),
    ).toBe(false);
  });

  it("keeps non-zero overview signals off onboarding", () => {
    expect(
      canShowAgentWalletEmptyState({
        overview: { ...emptyOverview, openCount: 1 },
        historyTotalRecords: 0,
        historyProbeFailed: false,
        loading: false,
      }),
    ).toBe(false);
    expect(isAgentOverviewSignalsEmpty({ ...emptyOverview, pendingTotalKopecks: 1 })).toBe(false);
  });
});
