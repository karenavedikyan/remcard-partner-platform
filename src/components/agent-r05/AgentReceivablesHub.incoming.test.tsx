import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "./AgentReceivablesHub";

const overviewFixture = {
  confirmedTotalKopecks: 250000,
  pendingTotalKopecks: 12000,
  suspendedTotalKopecks: 3000,
  openCount: 2,
  pendingCount: 1,
  coverage: { needsReviewCount: 0 },
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

import { fetchAgentReceivablesOverview } from "@/lib/agent-r05/api";

describe("AgentReceivablesHub incomingOnly overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(overviewFixture as never);
  });

  it("shows one primary receivable tile and no payable direction tile", async () => {
    render(<AgentReceivablesHub />);
    const grid = await screen.findByTestId("agent-r05-overview-grid");
    expect(within(grid).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("agent-r05-incoming-tile")).toBeInTheDocument();
    expect(screen.queryByText(/^Я должен$/)).toBeNull();
  });

  it("shows pending and suspended as footnotes, not as total tiles", async () => {
    render(<AgentReceivablesHub />);
    await screen.findByTestId("agent-r05-incoming-tile");
    expect(screen.getByTestId("agent-reward-pending")).toHaveTextContent(/не входит в баланс/i);
    expect(screen.getByTestId("agent-reward-suspended")).toHaveTextContent(/не входит в баланс/i);
    expect(screen.queryByRole("button", { name: /ожидает подтверждения/i })).toBeNull();
  });

  it("uses confirmed total on the primary tile only", async () => {
    render(<AgentReceivablesHub />);
    const tile = await screen.findByTestId("agent-r05-incoming-tile");
    expect(tile).toHaveTextContent("2 500 ₽");
    expect(tile).not.toHaveTextContent("120 ₽");
  });

  it("drills down to partners from the primary tile", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(overviewFixture as never);
    const { fetchAgentReceivablePartners } = await import("@/lib/agent-r05/api");
    vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
      partners: [
        {
          groupKey: "g1",
          partnerId: "p1",
          displayName: "Partner QA",
          legalCaption: "",
          referenceOrderCount: 1,
          legalSideCount: 1,
          earliestPurchaseAt: null,
          confirmedDebtKopecks: 250000,
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        totalRecords: 1,
        selectionTotalKopecks: 250000,
      },
    } as never);

    render(<AgentReceivablesHub />);
    await userEvent.click(await screen.findByTestId("agent-r05-incoming-tile"));
    expect(await screen.findByTestId("agent-r05-partners")).toBeInTheDocument();
    expect(screen.getByText("Partner QA")).toBeInTheDocument();
  });
});
