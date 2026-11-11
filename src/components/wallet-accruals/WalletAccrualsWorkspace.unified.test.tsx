import { render, screen, waitFor } from "@testing-library/react";
import { walletSessionTestUser } from "@/lib/wallet-session-test-user";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: { primary: "primary", secondary: "secondary", button: "button", text: "text" } }));
vi.mock("@/components/ui/FormField.module.css", () => ({ default: {} }));
vi.mock("@/components/payout/payout-record.module.css", () => ({}));

vi.mock("@/components/settlements/settlements.module.css", () => ({ default: {} }));
vi.mock("@/components/specialist-wallet/specialist-wallet.module.css", () => ({ default: {} }));
vi.mock("@/components/agent-r05/agent-receivables.module.css", () => ({ default: {} }));

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
  isSettlementsAccessDenied: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn().mockResolvedValue({
    ok: true,
    data: { user: { id: "actor-1", displayName: "Сотрудник", publicId: "RC-ACTOR" } },
  }),
}));

vi.mock("@/lib/agent-r05/api", () => ({
  fetchAgentReceivableOrders: vi.fn(),
  fetchAgentReceivablesOverview: vi.fn().mockResolvedValue({
    contractVersion: "1",
    confirmedTotalKopecks: 0,
    openCount: 0,
    pendingCount: 0,
    coverage: {
      note: "",
      needsReviewCount: 0,
      excludedFromConfirmedTotal: 0,
    },
  }),
  fetchAgentReceivablePartners: vi.fn(),
  fetchAgentReceivableOrderDetail: vi.fn(),
  downloadAgentReceivablesExport: vi.fn(),
}));

vi.mock("@/components/agent-r05/agent-receivables.module.css", () => ({ default: {} }));

vi.mock("@/components/settlements/reward-lifecycle.module.css", () => ({ default: {} }));

vi.mock("@/components/agent-r05/AgentReceivablesHub", () => ({
  AgentReceivablesHub: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="agent-r05-receivables">
      <button type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
}));

vi.mock("@/components/payout/PayoutRecordModal", () => ({
  PayoutRecordModal: () => (
    <div data-testid="payout-record-modal">
      <h2>Зафиксировать выплату</h2>
    </div>
  ),
}));

import { fetchSettlements } from "@/lib/settlements-loader";
import { fetchAgentReceivableOrders, fetchAgentReceivablePartners } from "@/lib/agent-r05/api";
import { buildAgentReceivablesHistoryProbeParams } from "@/lib/wallet-empty/agent-history-probe";
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

const settlementsPayload = {
  receivable: [],
  payable: [],
  completed: [],
  coverageNote: "",
};

describe("WalletAccrualsWorkspace unified surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettlements).mockResolvedValue(settlementsPayload);
    vi.mocked(fetchAgentReceivablePartners).mockResolvedValue({
      partners: [],
      meta: {
        totalRecords: 1,
        confirmedTotalKopecks: 0,
        selectionTotalKopecks: 0,
        page: 1,
        pageSize: 25,
        pageCount: 1,
        sort: "name",
        periodField: "purchaseAt",
        periodTimezone: "UTC",
      },
    });
  });

  it("fetches settlements once on mount and not again when opening master ledger subview", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsWorkspace user={walletSessionTestUser} scopeKey="spec" masterLedger={{ ledgerScopeKey: "spec:ledger" }} />,
    );
    await screen.findByTestId("wallet-accruals");
    expect(fetchSettlements).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("wallet-open-master-ledger"));
    await screen.findByTestId("specialist-settlements-workspace");
    expect(fetchSettlements).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("wallet-ledger-back"));
    await screen.findByTestId("wallet-accruals");
  });

  it("does not mount agent orders API until agent registry subview opens", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsWorkspace
        incomingOnly
        agentRegistry
        scopeKey="agent"
        walletEmptyViewerRole="agent"
      />,
    );
    await screen.findByTestId("wallet-accruals");
    expect(fetchSettlements).toHaveBeenCalledTimes(1);
    expect(fetchAgentReceivablePartners).toHaveBeenCalled();
    expect(fetchAgentReceivableOrders).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("wallet-open-agent-registry"));
    await waitFor(() => expect(screen.getByTestId("agent-r05-receivables")).toBeInTheDocument());
    const probeCalls = vi.mocked(fetchAgentReceivablePartners).mock.calls.filter(
      ([params]) => params.toString() === buildAgentReceivablesHistoryProbeParams().toString(),
    );
    expect(probeCalls.length).toBe(1);
    expect(fetchAgentReceivableOrders).not.toHaveBeenCalled();
  });
});
