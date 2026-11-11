import { render, screen, waitFor } from "@testing-library/react";
import { walletSessionTestUser } from "@/lib/wallet-session-test-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesWallet } from "@/components/agent-r05/AgentReceivablesWallet";
import { BusinessOwnerWallet } from "@/components/business-wallet/BusinessOwnerWallet";
import { SpecialistMasterWallet } from "@/components/specialist-wallet/SpecialistMasterWallet";
import { RemcardApiError } from "@/lib/api-client";

const walletAccrualsShellStats = { renders: 0 };

vi.mock("@/components/wallet-accruals/WalletAccrualsShell", () => ({
  WalletAccrualsShell: function MockWalletAccrualsShell() {
    walletAccrualsShellStats.renders += 1;
    return <div data-testid="wallet-accruals" />;
  },
}));

vi.mock("@/components/wallet-accruals/wallet-accruals.global.css", () => ({}));
vi.mock("@/components/wallet-prototype-shell/wallet-prototype-shell.module.css", () => ({
  default: {},
}));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: {} }));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));
vi.mock("@/components/settlements/settlements.module.css", () => ({ default: {} }));
vi.mock("@/components/specialist-wallet/specialist-wallet.module.css", () => ({ default: {} }));
vi.mock("@/components/agent-r05/agent-receivables.module.css", () => ({ default: {} }));
vi.mock("@/components/profile/agent/AgentProfileWizard.module.css", () => ({ default: {} }));

vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => null,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn().mockResolvedValue({
    ok: true,
    data: { user: { id: "u1" }, partner: { type: "AGENT" } },
  }),
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

vi.mock("@/components/profile/agent/AgentPayoutRequisitesPanel", () => ({
  AgentPayoutRequisitesPanel: () => <div data-testid="agent-payout-requisites-panel" />,
}));

import { fetchSettlements } from "@/lib/settlements-loader";
import {
  fetchAgentReceivableOrders,
  fetchAgentReceivablePartners,
  fetchAgentReceivablesOverview,
} from "@/lib/agent-r05/api";
import { buildAgentReceivablesHistoryProbeParams } from "@/lib/wallet-empty/agent-history-probe";

const emptySettlements = {
  coverageNote: "",
  receivable: [],
  payable: [],
  completed: [],
};

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

type DeferredGateOutcome = "empty" | "shellRecords" | "missingMeta" | "probe403" | "networkError";

function mockAgentProbe(totalRecords: number | "missing" | "reject403") {
  vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
  if (totalRecords === "reject403") {
    vi.mocked(fetchAgentReceivablePartners).mockRejectedValue(new RemcardApiError(403, "Forbidden"));
    return;
  }
  if (totalRecords === "missing") {
    vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
      partners: [],
      meta: { ...probeMeta(0), totalRecords: undefined as unknown as number },
    });
    return;
  }
  vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
    partners: [],
    meta: probeMeta(totalRecords),
  });
}

function installDeferredAgentGate(outcome: DeferredGateOutcome) {
  let resolveOverview!: (value: typeof emptyOverview) => void;
  let resolvePartners!: (value: unknown) => void;
  let rejectPartners!: (error: unknown) => void;

  const overviewPromise = new Promise<typeof emptyOverview>((resolve) => {
    resolveOverview = resolve;
  });
  const partnersPromise = new Promise<unknown>((resolve, reject) => {
    resolvePartners = resolve;
    rejectPartners = reject;
  });

  let shellRendersAtGateStart: number | null = null;

  vi.mocked(fetchAgentReceivablesOverview).mockImplementation(() => {
    shellRendersAtGateStart = walletAccrualsShellStats.renders;
    return overviewPromise;
  });
  vi.mocked(fetchAgentReceivablePartners).mockImplementation((params) => {
    if (params.toString() === buildAgentReceivablesHistoryProbeParams().toString()) {
      return partnersPromise as never;
    }
    return Promise.resolve({ partners: [], meta: probeMeta(0) });
  });

  const release = () => {
    resolveOverview(emptyOverview);
    switch (outcome) {
      case "empty":
        resolvePartners({ partners: [], meta: probeMeta(0) });
        break;
      case "shellRecords":
        resolvePartners({ partners: [], meta: probeMeta(3) });
        break;
      case "missingMeta":
        resolvePartners({
          partners: [],
          meta: { ...probeMeta(0), totalRecords: undefined as unknown as number },
        });
        break;
      case "probe403":
        rejectPartners(new RemcardApiError(403, "Forbidden"));
        break;
      case "networkError":
        rejectPartners(new TypeError("Failed to fetch"));
        break;
    }
  };

  return {
    release,
    shellRendersAtGateStart: () => shellRendersAtGateStart,
    waitForGateStart: async () => {
      await waitFor(() => {
        expect(vi.mocked(fetchAgentReceivablesOverview)).toHaveBeenCalled();
        expect(shellRendersAtGateStart).not.toBeNull();
      });
    },
  };
}

describe("wallet entry empty gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletAccrualsShellStats.renders = 0;
    vi.mocked(fetchSettlements).mockResolvedValue(emptySettlements);
  });

  it("agent wallet shows empty onboarding at entry when settlements and probe are zero", async () => {
    mockAgentProbe(0);
    render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-empty-state")).toHaveAttribute(
      "data-wallet-empty-role",
      "agent",
    );
    expect(screen.queryByTestId("wallet-accruals")).toBeNull();
    expect(vi.mocked(fetchAgentReceivablesOverview)).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(fetchAgentReceivablePartners).mock.calls.some(
        ([p]) => p.toString() === buildAgentReceivablesHistoryProbeParams().toString(),
      ),
    ).toBe(true);
    expect(vi.mocked(fetchAgentReceivableOrders)).not.toHaveBeenCalled();
  });

  it("agent wallet keeps accruals shell when history totalRecords > 0", async () => {
    mockAgentProbe(3);
    render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent wallet keeps shell when probe meta is missing", async () => {
    mockAgentProbe("missing");
    render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent wallet keeps shell when history probe returns 403", async () => {
    mockAgentProbe("reject403");
    render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("agent wallet keeps shell when history probe fails with network error", async () => {
    vi.mocked(fetchAgentReceivablesOverview).mockResolvedValue(emptyOverview);
    vi.mocked(fetchAgentReceivablePartners).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("specialist master wallet still shows empty from settlements only", async () => {
    render(<SpecialistMasterWallet user={walletSessionTestUser} walletEmptyViewerRole="specialist" />);
    expect(await screen.findByTestId("wallet-empty-state")).toHaveAttribute(
      "data-wallet-empty-role",
      "specialist",
    );
    expect(vi.mocked(fetchAgentReceivablesOverview)).not.toHaveBeenCalled();
  });

  it("business owner wallet still shows empty from settlements only", async () => {
    render(
      <BusinessOwnerWallet
        partnerType="STORE"
        ledgerScopeKey="STORE:org-1:actor-1"
        walletEmptyViewerRole="store"
      />,
    );
    expect(await screen.findByTestId("wallet-empty-state")).toHaveAttribute(
      "data-wallet-empty-role",
      "store",
    );
    expect(vi.mocked(fetchAgentReceivablesOverview)).not.toHaveBeenCalled();
  });
});

describe("agent gate: no WalletAccrualsShell render before probe completes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletAccrualsShellStats.renders = 0;
    vi.mocked(fetchSettlements).mockResolvedValue(emptySettlements);
  });

  it.each([
    ["totalRecords 0 -> empty", "empty" as const, "wallet-empty-state"],
    ["totalRecords > 0 -> shell", "shellRecords" as const, "wallet-accruals"],
    ["missing probe meta -> shell", "missingMeta" as const, "wallet-accruals"],
    ["403 probe -> shell", "probe403" as const, "wallet-accruals"],
    ["network error on probe -> shell", "networkError" as const, "wallet-accruals"],
  ] as const)(
    "%s",
    async (_label, outcome, finalTestId) => {
      const gate = installDeferredAgentGate(outcome);
      render(<AgentReceivablesWallet user={walletSessionTestUser} walletEmptyViewerRole="agent" />);
      await gate.waitForGateStart();
      expect(gate.shellRendersAtGateStart()).toBe(0);
      expect(walletAccrualsShellStats.renders).toBe(0);
      gate.release();
      expect(await screen.findByTestId(finalTestId)).toBeInTheDocument();
      if (finalTestId === "wallet-empty-state") {
        expect(walletAccrualsShellStats.renders).toBe(0);
      } else {
        expect(walletAccrualsShellStats.renders).toBeGreaterThan(0);
      }
    },
  );
});
