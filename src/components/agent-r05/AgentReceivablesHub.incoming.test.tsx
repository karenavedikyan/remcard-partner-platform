import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "./AgentReceivablesHub";

vi.mock("@/lib/agent-r05/api", () => ({
  fetchAgentReceivablesOverview: vi.fn().mockResolvedValue({
    confirmedTotalKopecks: 10000,
    pendingTotalKopecks: 0,
    suspendedTotalKopecks: 0,
    openCount: 1,
    pendingCount: 0,
    coverage: { needsReviewCount: 0 },
  }),
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

describe("AgentReceivablesHub incomingOnly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show a payable direction tile", async () => {
    render(<AgentReceivablesHub />);
    expect(await screen.findByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.queryByText(/^Я должен$/)).toBeNull();
  });
});
