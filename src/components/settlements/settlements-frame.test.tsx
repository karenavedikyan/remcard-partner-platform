import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import hubStyles from "@/components/settlements/settlements.module.css";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import type { AuthUser } from "@/lib/types";

const settlementsHubUser: AuthUser = {
  id: "frame-test",
  role: "PRO",
  partnerType: null,
  displayName: "Test",
};
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn().mockResolvedValue({
    coverageNote: "",
    receivable: [],
    payable: [],
    completed: [],
  }),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

vi.mock("@/lib/agent-r05/api", () => ({
  fetchAgentReceivablesOverview: vi.fn().mockResolvedValue({
    confirmedTotalKopecks: 0,
    pendingTotalKopecks: 0,
    suspendedTotalKopecks: 0,
    openCount: 0,
    pendingCount: 0,
    coverage: { needsReviewCount: 0 },
  }),
  fetchAgentReceivablePartners: vi.fn().mockResolvedValue({
    partners: [],
    meta: {
      totalRecords: 0,
      confirmedTotalKopecks: 0,
      selectionTotalKopecks: 0,
      page: 1,
      pageSize: 25,
      pageCount: 0,
      sort: "name",
      periodField: "purchaseAt",
      periodTimezone: "UTC",
    },
  }),
  fetchAgentReceivableOrders: vi.fn(),
  fetchAgentReceivableOrderDetail: vi.fn(),
  downloadAgentReceivablesExport: vi.fn(),
}));

vi.mock("@/lib/agent-r05/receivables-prefs", () => ({
  defaultReceivablesPrefs: { view: "list", pageSize: 25 },
  loadReceivablesPrefsFromStorage: () => ({ view: "list", pageSize: 25 }),
  saveReceivablesPrefs: vi.fn(),
}));

describe("settlements workspace prototype frame", () => {
  it("wraps specialist workspace in a single settlement demo frame", async () => {
    render(
      <SpecialistSettlementsWorkspace
        user={settlementsHubUser}
        previewData={{ coverageNote: "", receivable: [], payable: [], completed: [] }}
      />,
    );
    const root = await screen.findByTestId("specialist-settlements-workspace");
    expect(root).toHaveClass(hubStyles.settlementDemo);
  });

  it("wraps agent receivables in a single settlement demo frame", async () => {
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    const frame = await screen.findByTestId("agent-settlements-workspace-frame");
    expect(frame).toHaveClass(hubStyles.settlementDemo);
    expect(screen.getByTestId("agent-r05-receivables")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid="agent-settlements-workspace-frame"]')).toHaveLength(
      1,
    );
  });

  it("keeps hub settlements on one settlement demo root without nesting", async () => {
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="specialist" />);
    const hub = await screen.findByTestId("settlements-hub");
    expect(hub).toHaveClass(hubStyles.settlementDemo);
    expect(document.querySelectorAll('[data-testid="settlements-hub"]')).toHaveLength(1);
  });
});
