import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { RemcardApiError } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";

const settlementsHubUser: AuthUser = {
  id: "wallet-empty-test",
  role: "PRO",
  partnerType: null,
  displayName: "Test",
};

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn(),
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
import { fetchAuthMeSafe } from "@/lib/auth-session";
import { remcardFetch } from "@/lib/api-client";
import {
  fetchAgentReceivableOrders,
  fetchAgentReceivablePartners,
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";
import { buildAgentReceivablesHistoryProbeParams } from "@/lib/wallet-empty/agent-history-probe";

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
  pageSize: 25,
  pageCount: totalRecords > 0 ? 1 : 0,
  sort: "name",
  periodField: "purchaseAt" as const,
  periodTimezone: "UTC" as const,
});

function mockAgentEmptyProbe(totalRecords: number) {
  vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
  vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
    partners: [],
    meta: probeMeta(totalRecords),
  });
}

describe("wallet empty integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(fetchAuthMeSafe).mockReset();
    vi.mocked(fetchAuthMeSafe).mockResolvedValue({
      ok: true,
      data: { user: { role: "PRO" } },
    });
  });

  it("agent R05 shows empty only when overview and unfiltered history probe are zero", async () => {
    mockAgentEmptyProbe(0);
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-empty-state")).toHaveAttribute(
      "data-wallet-empty-role",
      "agent",
    );
    expect(screen.queryByTestId("agent-r05-overview-grid")).toBeNull();
    const probeCall = vi.mocked(fetchAgentReceivablePartners).mock.calls.find(([params]) =>
      params.get("pageSize") === "25" && params.get("sort") === "name",
    )?.[0];
    expect(probeCall).toBeInstanceOf(URLSearchParams);
    expect((probeCall as URLSearchParams).get("status")).toBe("all");
    expect((probeCall as URLSearchParams).toString()).toBe(
      buildAgentReceivablesHistoryProbeParams().toString(),
    );
    expect(vi.mocked(fetchAgentReceivableOrders)).not.toHaveBeenCalled();
  });

  it("agent hides onboarding when history has closed/cancelled rows but overview is zero", async () => {
    mockAgentEmptyProbe(2);
    render(<AgentReceivablesHub walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("agent-r05-overview-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent hides onboarding when history probe meta is missing", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
    vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
      partners: [],
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
    vi.mocked(fetchAgentReceivablePartners).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                partners: [],
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
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="agent" />);
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
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="specialist" />);
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
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="specialist" />);
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
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="store" />);
    const cta = await screen.findByTestId("wallet-empty-primary-cta");
    expect(cta.tagName).toBe("A");
    expect(cta).toHaveAttribute("href", "/scanner");
  });

  it("omitted viewer role keeps legacy UI without empty onboarding hero", async () => {
    mockAgentEmptyProbe(0);
    render(<AgentReceivablesHub />);
    await screen.findByTestId("agent-r05-overview-grid");
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("null viewer role on hub keeps legacy empty ledger chrome", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole={null} />);
    expect(await screen.findByTestId("settlements-hub")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("omitted viewer role on hub keeps legacy empty ledger chrome", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub user={settlementsHubUser} />);
    expect(await screen.findByTestId("settlements-hub")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("store empty hub stays static when page prop is omitted", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="store" />);
    await screen.findByTestId("wallet-empty-state");
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
    expect(vi.mocked(fetchAuthMeSafe)).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).toBeNull();
  });

  it("store empty hub links history when canLinkOnboardingHistory prop is true without auth/me", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="store" canLinkOnboardingHistory />);
    await screen.findByTestId("wallet-empty-state");
    expect(vi.mocked(fetchAuthMeSafe)).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("link", { name: /Подтверждение.*Открыть историю/i }),
    ).toHaveAttribute("href", "/history");
  });

  it("store empty hub stays static when canLinkOnboardingHistory prop is false without auth/me", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(
      <SettlementsHub
        user={settlementsHubUser}
        walletEmptyViewerRole="store"
        canLinkOnboardingHistory={false}
      />,
    );
    await screen.findByTestId("wallet-empty-state");
    expect(vi.mocked(fetchAuthMeSafe)).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).toBeNull();
  });
});
