import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

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

import { fetchSettlements } from "@/lib/settlements-loader";
import {
  fetchAgentReceivableOrders,
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";

const emptyOverview = {
  contractVersion: "1",
  confirmedTotalKopecks: 0,
  pendingTotalKopecks: 0,
  suspendedTotalKopecks: 0,
  openCount: 0,
  pendingCount: 0,
  coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
};

const probeMeta = (totalRecords: number) => ({
  totalRecords,
  confirmedTotalKopecks: 0,
  selectionTotalKopecks: 0,
  page: 1,
  pageSize: 1,
  pageCount: totalRecords > 0 ? totalRecords : 0,
  sort: "date-desc",
  periodField: "purchaseAt" as const,
  periodTimezone: "UTC" as const,
});

function mockAgentEmptyProbe(totalRecords: number) {
  vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
  vi.mocked(fetchAgentReceivableOrders).mockResolvedValue({
    orders: [],
    meta: probeMeta(totalRecords),
  });
}

describe("wallet empty integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agent R05 shows empty only when overview and unfiltered history probe are zero", async () => {
    mockAgentEmptyProbe(0);
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-empty-state")).toHaveAttribute(
      "data-wallet-empty-role",
      "agent",
    );
    expect(screen.queryByTestId("agent-r05-overview-grid")).toBeNull();
    const probeCall = vi.mocked(fetchAgentReceivableOrders).mock.calls[0]?.[0];
    expect(probeCall).toBeInstanceOf(URLSearchParams);
    expect((probeCall as URLSearchParams).get("status")).toBe("all");
  });

  it("agent hides onboarding when history has closed/cancelled rows but overview is zero", async () => {
    mockAgentEmptyProbe(2);
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-overview-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent hides onboarding when history probe meta is missing", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
    vi.mocked(fetchAgentReceivableOrders).mockResolvedValue({
      orders: [],
      meta: { ...probeMeta(0), totalRecords: undefined as unknown as number },
    });
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-overview-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent keeps error state on failed overview load without empty onboarding", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockRejectedValue(
      new RemcardApiError(500, "Сбой"),
    );
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/сбой/i);
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent ignores stale history probe after a quick reload", async () => {
    mockAgentEmptyProbe(0);
    const { unmount } = render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    await screen.findByTestId("wallet-empty-state");
    unmount();

    vi.mocked(fetchAgentReceivablesOverview).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(emptyOverview), 30);
        }),
    );
    vi.mocked(fetchAgentReceivableOrders).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                orders: [],
                meta: probeMeta(5),
              }),
            80,
          );
        }),
    );
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-overview-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("hub agent role uses certificates route on empty onboarding", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub walletEmptyViewerRole="agent" />);
    const cta = await screen.findByTestId("wallet-empty-primary-cta");
    expect(cta).toHaveAttribute("href", "/certificates/new");
  });

  it("hub settlements shows empty onboarding for zero payload", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub walletEmptyViewerRole="specialist" />);
    expect(await screen.findByTestId("wallet-empty-state")).toBeInTheDocument();
  });

  it("hub keeps search empty message when data exists but filter matches nothing", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "b1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "c1",
          counterpartyName: "Visible Partner",
          amount: 10,
          basis: "basis",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub walletEmptyViewerRole="specialist" />);
    await screen.findByTestId("settlements-hub");
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/партнёр, сертификат/i), "zzzz-no-match");
    expect(await screen.findByText(/открытых начислений «мне должны» нет/i)).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("primary CTA is a navigation link without POST side effects", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub walletEmptyViewerRole="store" />);
    const cta = await screen.findByTestId("wallet-empty-primary-cta");
    expect(cta.tagName).toBe("A");
    expect(cta).toHaveAttribute("href", "/scanner");
  });
});
