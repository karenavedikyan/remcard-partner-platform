import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "./AgentReceivablesHub";
import { RemcardApiError } from "@/lib/api-client";
import { buildAgentReceivablesHistoryProbeParams } from "@/lib/wallet-empty/agent-history-probe";

const overviewWithBalance = {
  contractVersion: "1",
  confirmedTotalKopecks: 250000,
  pendingTotalKopecks: 0,
  suspendedTotalKopecks: 0,
  openCount: 2,
  pendingCount: 0,
  coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
};

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

vi.mock("@/lib/agent-r05/api", () => ({
  fetchAgentReceivablesOverview: vi.fn(),
  fetchAgentReceivablePartners: vi.fn(),
  fetchAgentReceivableOrders: vi.fn(),
  fetchAgentReceivableOrderDetail: vi.fn(),
  downloadAgentReceivablesExport: vi.fn(),
}));

vi.mock("@/lib/agent-r05/receivables-prefs", () => ({
  defaultReceivablesPrefs: { view: "list", pageSize: 25 },
  loadReceivablesPrefsFromStorage: () => ({ view: "list", pageSize: 25 }),
  saveReceivablesPrefs: vi.fn(),
}));

import {
  fetchAgentReceivableOrders,
  fetchAgentReceivablePartners,
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";

function mockHistoryProbePartners(
  resolve: { partners?: unknown[]; meta: ReturnType<typeof probeMeta> } | "reject",
) {
  vi.mocked(fetchAgentReceivablePartners).mockImplementation((params) => {
    if (params.toString() !== buildAgentReceivablesHistoryProbeParams().toString()) {
      return Promise.resolve({ partners: [], meta: probeMeta(1) });
    }
    if (resolve === "reject") {
      return Promise.reject(new RemcardApiError(403, "Forbidden"));
    }
    return Promise.resolve({ partners: resolve.partners ?? [], meta: resolve.meta });
  });
}

describe("AgentReceivablesHub history probe errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(overviewWithBalance);
  });

  it.each([
    ["403", new RemcardApiError(403, "Forbidden")],
    ["500", new RemcardApiError(500, "Internal error")],
    ["TypeError", new TypeError("Failed to fetch")],
  ])("keeps overview grid when probe fails with %s", async (_label, probeError) => {
    vi.mocked(fetchAgentReceivablePartners).mockImplementation((params) => {
      if (params.toString() === buildAgentReceivablesHistoryProbeParams().toString()) {
        return Promise.reject(probeError);
      }
      return Promise.resolve({ partners: [], meta: probeMeta(1) });
    });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    const tile = await screen.findByTestId("agent-r05-incoming-tile");
    expect(tile).toHaveTextContent("2 500 ₽");
    expect(screen.getByTestId("agent-history-probe-status")).toHaveTextContent(
      /не удалось проверить историю начислений/i,
    );
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(vi.mocked(fetchAgentReceivableOrders)).not.toHaveBeenCalled();
  });

  it("shows overview error without empty onboarding when overview fetch fails", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockRejectedValue(
      new RemcardApiError(500, "Сбой overview"),
    );
    mockHistoryProbePartners({ meta: probeMeta(0) });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/сбой overview/i);
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(screen.queryByTestId("agent-r05-overview-grid")).toBeNull();
  });

  it("keeps ledger UI without empty onboarding when probe meta is malformed", async () => {
    mockHistoryProbePartners({
      meta: { ...probeMeta(0), totalRecords: undefined as unknown as number },
    });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.getByTestId("agent-history-probe-status")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("fail-closed when probe meta totalRecords is negative", async () => {
    mockHistoryProbePartners({ meta: probeMeta(-1) });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.getByTestId("agent-history-probe-status")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("fail-closed when probe meta totalRecords is fractional", async () => {
    mockHistoryProbePartners({ meta: probeMeta(1.5) });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.getByTestId("agent-history-probe-status")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });
});
