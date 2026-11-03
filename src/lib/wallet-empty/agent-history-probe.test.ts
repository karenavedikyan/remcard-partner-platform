import { describe, expect, it } from "vitest";
import {
  buildAgentReceivablesHistoryProbeParams,
  canShowAgentWalletEmptyState,
  isAgentOverviewSignalsEmpty,
  isAgentReceivablesHistoryProbeParams,
  parseAgentHistoryGroupCount,
  parseAgentHistoryTotalRecords,
} from "./agent-history-probe";

const probeMeta = (totalRecords: number) => ({
  totalRecords,
  confirmedTotalKopecks: 0,
  selectionTotalKopecks: 0,
  page: 1,
  pageSize: 25,
  pageCount: 1,
  sort: "name",
  periodField: "purchaseAt" as const,
  periodTimezone: "UTC" as const,
});

describe("buildAgentReceivablesHistoryProbeParams", () => {
  it("requests unfiltered global partners probe (pageSize 25, sort=name)", () => {
    const params = buildAgentReceivablesHistoryProbeParams();
    expect(params.get("status")).toBe("all");
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("25");
    expect(params.get("sort")).toBe("name");
    expect(params.get("q")).toBeNull();
    expect(params.get("from")).toBeNull();
    expect(params.get("to")).toBeNull();
    expect(params.get("partnerId")).toBeNull();
    expect(params.get("groupKey")).toBeNull();
    expect(isAgentReceivablesHistoryProbeParams(params)).toBe(true);
  });
});

describe("parseAgentHistoryGroupCount", () => {
  it("returns null when meta is missing or invalid", () => {
    expect(parseAgentHistoryGroupCount(null)).toBeNull();
    expect(parseAgentHistoryGroupCount(undefined)).toBeNull();
    expect(parseAgentHistoryGroupCount({} as never)).toBeNull();
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["non-number", "0" as unknown as number],
  ])("rejects %s totalRecords", (_label, totalRecords) => {
    expect(parseAgentHistoryGroupCount(probeMeta(totalRecords as number))).toBeNull();
    expect(parseAgentHistoryTotalRecords(probeMeta(totalRecords as number))).toBeNull();
  });

  it("accepts non-negative integers only", () => {
    expect(parseAgentHistoryGroupCount(probeMeta(0))).toBe(0);
    expect(parseAgentHistoryGroupCount(probeMeta(3))).toBe(3);
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

  it("requires overview signals empty and history group count zero", () => {
    expect(
      canShowAgentWalletEmptyState({
        overview: emptyOverview,
        historyTotalRecords: 0,
        historyProbeFailed: false,
        loading: false,
      }),
    ).toBe(true);
  });

  it("does not treat overview zero alone as empty when history has groups", () => {
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
