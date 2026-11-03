import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import {
  buildAgentReceivablesHistoryProbeParams,
  fetchAgentReceivablesEmptyGateSignals,
  isAgentReceivablesHistoryProbeParams,
} from "./agent-history-probe";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

import { remcardFetch } from "@/lib/api-client";

const emptyOverview = {
  contractVersion: "1",
  confirmedTotalKopecks: 0,
  pendingTotalKopecks: 0,
  suspendedTotalKopecks: 0,
  openCount: 0,
  pendingCount: 0,
  coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
};

const ORDERS_400 =
  "groupKey (partnerGroupKey) обязателен для списка заказов";

function partnersMeta(totalRecords: number) {
  return {
    totalRecords,
    confirmedTotalKopecks: 0,
    selectionTotalKopecks: 0,
    page: 1,
    pageSize: 25,
    pageCount: totalRecords > 0 ? 1 : 0,
    sort: "name",
    periodField: "purchaseAt" as const,
    periodTimezone: "UTC" as const,
  };
}

describe("agent history probe contract (transport)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      const url = path.startsWith("http") ? new URL(path) : new URL(path, "http://test.local");
      const pathname = url.pathname;
      const search = url.searchParams;

      if (pathname.endsWith("/api/pro/wallet/agent-receivables/overview")) {
        return emptyOverview;
      }

      if (pathname.endsWith("/api/pro/wallet/agent-receivables/orders")) {
        if (!search.get("groupKey") && !search.get("partnerId")) {
          throw new RemcardApiError(400, ORDERS_400, { error: ORDERS_400 });
        }
        return { orders: [], meta: partnersMeta(0) };
      }

      if (pathname.endsWith("/api/pro/wallet/agent-receivables/partners")) {
        if (!isAgentReceivablesHistoryProbeParams(search)) {
          return { partners: [], meta: partnersMeta(0) };
        }
        const n = Number(search.get("__fixtureGroups") ?? "0");
        return { partners: [], meta: partnersMeta(n) };
      }

      throw new Error(`Unexpected remcardFetch path: ${path}`);
    });
  });

  it("uses partners probe URL without groupKey and never calls orders for gate", async () => {
    const expectedQuery = buildAgentReceivablesHistoryProbeParams().toString();
    const probeUrl = `/api/pro/wallet/agent-receivables/partners?${expectedQuery}`;

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/overview")) return emptyOverview;
      if (path.includes("/orders")) {
        throw new RemcardApiError(400, ORDERS_400, { error: ORDERS_400 });
      }
      if (path === probeUrl) {
        return { partners: [], meta: partnersMeta(0) };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const signals = await fetchAgentReceivablesEmptyGateSignals();
    expect(signals.historyProbeFailed).toBe(false);
    expect(signals.historyTotalRecords).toBe(0);

    const paths = vi.mocked(remcardFetch).mock.calls.map(([p]) => String(p));
    expect(paths.some((p) => p.includes("/orders"))).toBe(false);
    expect(paths).toContain(probeUrl);
    const partnersCall = paths.find((p) => p.includes("/partners"));
    expect(partnersCall).toBe(probeUrl);
    const q = new URL(partnersCall!, "http://test.local").searchParams;
    expect(q.get("status")).toBe("all");
    expect(q.get("page")).toBe("1");
    expect(q.get("pageSize")).toBe("25");
    expect(q.get("sort")).toBe("name");
    expect(q.get("groupKey")).toBeNull();
    expect(q.get("partnerId")).toBeNull();
  });

  it("empty gate when partner group count is zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/overview")) return emptyOverview;
      if (path.includes("/partners")) return { partners: [], meta: partnersMeta(0) };
      throw new RemcardApiError(400, ORDERS_400, { error: ORDERS_400 });
    });
    const signals = await fetchAgentReceivablesEmptyGateSignals();
    expect(signals.historyProbeFailed).toBe(false);
    expect(signals.historyTotalRecords).toBe(0);
  });

  it("probe failed semantics when partner group count > 0 (no empty onboarding)", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/overview")) return emptyOverview;
      if (path.includes("/partners")) return { partners: [{ groupKey: "g1" } as never], meta: partnersMeta(2) };
      throw new RemcardApiError(400, ORDERS_400, { error: ORDERS_400 });
    });
    const signals = await fetchAgentReceivablesEmptyGateSignals();
    expect(signals.historyProbeFailed).toBe(false);
    expect(signals.historyTotalRecords).toBe(2);
  });

  it("fail-closed on 403 partners probe", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/overview")) return emptyOverview;
      if (path.includes("/partners")) throw new RemcardApiError(403, "Forbidden");
      throw new Error("unexpected");
    });
    const signals = await fetchAgentReceivablesEmptyGateSignals();
    expect(signals.historyProbeFailed).toBe(true);
    expect(signals.historyTotalRecords).toBeNull();
  });
});
