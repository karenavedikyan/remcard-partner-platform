import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "./AgentReceivablesHub";
import { RemcardApiError } from "@/lib/api-client";

const overviewWithBalance = {
  contractVersion: "1",
  confirmedTotalKopecks: 250000,
  pendingTotalKopecks: 0,
  suspendedTotalKopecks: 0,
  openCount: 2,
  pendingCount: 0,
  coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
};

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
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";

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
    vi.mocked(fetchAgentReceivableOrders).mockRejectedValue(probeError);
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    const tile = await screen.findByTestId("agent-r05-incoming-tile");
    expect(tile).toHaveTextContent("2 500 ₽");
    expect(screen.getByTestId("agent-history-probe-status")).toHaveTextContent(
      /не удалось проверить историю начислений/i,
    );
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows overview error without empty onboarding when overview fetch fails", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockRejectedValue(
      new RemcardApiError(500, "Сбой overview"),
    );
    vi.mocked(fetchAgentReceivableOrders).mockResolvedValue({
      orders: [],
      meta: {
        totalRecords: 0,
        confirmedTotalKopecks: 0,
        selectionTotalKopecks: 0,
        page: 1,
        pageSize: 1,
        pageCount: 0,
        sort: "date-desc",
        periodField: "purchaseAt",
        periodTimezone: "UTC",
      },
    });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/сбой overview/i);
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(screen.queryByTestId("agent-r05-overview-grid")).toBeNull();
  });

  it("keeps ledger UI without empty onboarding when probe meta is malformed", async () => {
    vi.mocked(fetchAgentReceivableOrders).mockResolvedValue({
      orders: [],
      meta: { page: 1, pageSize: 1 } as never,
    });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.getByTestId("agent-history-probe-status")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });
});
