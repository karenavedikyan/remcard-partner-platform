import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { WALLET_STALE_DATA_NOTICE } from "@/lib/wallet-data-refresh";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: {} }));
vi.mock("@/components/payout/payout-record.module.css", () => ({}));
vi.mock("@/components/settlements/settlements.module.css", () => ({}));
vi.mock("@/components/specialist-wallet/specialist-wallet.module.css", () => ({}));
vi.mock("@/components/agent-r05/agent-receivables.module.css", () => ({}));

vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => null,
}));
vi.mock("@/components/agent-r05/AgentReceivablesHub", () => ({
  AgentReceivablesHub: () => null,
}));
vi.mock("@/components/ui/Button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props} />
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

import { fetchSettlements } from "@/lib/settlements-loader";
import { fetchAuthMeSafe } from "@/lib/auth-session";
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

const pendingAgentRow = {
  id: "agent-bonus-1",
  orderId: "order-1",
  accrualType: "agentBonus" as const,
  counterpartyId: "store-1",
  counterpartyName: "OPT",
  amount: 0,
  pendingAmount: 15000,
  basis: "Сертификат",
  status: "CALCULATED" as const,
  createdAt: "2026-10-01T10:00:00.000Z",
};

describe("WalletAccrualsWorkspace visible refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows pending>0 with confirmed=0 without masquerading fetch failure as empty", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [pendingAgentRow],
      payable: [],
      completed: [],
    });

    render(
      <WalletAccrualsWorkspace
        incomingOnly
        agentRegistry
        scopeKey="agent-a"
        walletEmptyViewerRole="agent"
      />,
    );

    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();
    expect(screen.getAllByText(/15\s000 ₽/).length).toBeGreaterThan(0);
  });

  it("preserves same-scope data when background refresh fails", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce({
        coverageNote: "",
        receivable: [pendingAgentRow],
        payable: [],
        completed: [],
      })
      .mockRejectedValueOnce(new RemcardApiError(500, "Сбой"));

    render(<WalletAccrualsWorkspace incomingOnly scopeKey="scope-1" walletEmptyViewerRole="agent" />);

    expect(await screen.findByTestId("wallet-accruals")).toBeInTheDocument();

    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(800);

    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId("wallet-refresh-notice")).toHaveTextContent(
      WALLET_STALE_DATA_NOTICE,
    );
    expect(screen.getByTestId("wallet-accruals")).toBeInTheDocument();
  });

  it("does not background-fetch preview fixtures", async () => {
    render(
      <WalletAccrualsWorkspace
        previewData={{
          coverageNote: "",
          receivable: [pendingAgentRow],
          payable: [],
          completed: [],
        }}
      />,
    );

    expect(screen.getByTestId("wallet-accruals")).toBeInTheDocument();
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchSettlements).not.toHaveBeenCalled();
  });

  it("does not probe auth/me on background visible refresh", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [pendingAgentRow],
      payable: [],
      completed: [],
    });

    render(<WalletAccrualsWorkspace incomingOnly scopeKey="scope-auth-probe" />);
    await screen.findByTestId("wallet-accruals");
    expect(fetchAuthMeSafe).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(800);
    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(2));
    expect(fetchAuthMeSafe).toHaveBeenCalledTimes(1);
  });

  it("clears data on 401 and shows auth error", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(401, "Unauthorized"));

    render(<WalletAccrualsWorkspace scopeKey="auth-scope" />);

    expect(await screen.findByTestId("wallet-accruals-error")).toHaveTextContent(/сессия завершилась/i);
  });
});
