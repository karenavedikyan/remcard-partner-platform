import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: { primary: "primary", secondary: "secondary" } }));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));
vi.mock("@/components/settlements/settlements.module.css", () => ({ default: {} }));
vi.mock("@/components/specialist-wallet/specialist-wallet.module.css", () => ({ default: {} }));

vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => null,
}));

vi.mock("@/components/agent-r05/AgentReceivablesHub", () => ({
  AgentReceivablesHub: () => null,
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
  isSettlementsAccessDenied: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn().mockResolvedValue({
    ok: true,
    data: { user: { id: "actor-1", displayName: "Сотрудник", publicId: "RC-ACTOR" } },
  }),
}));

vi.mock("@/lib/payout-record", () => ({
  payoutConfirmLabel: (m: string) =>
    m === "CASH" ? "Подтвердить выплату наличными" : "Подтвердить перевод",
  PAYOUT_EXTERNAL_FACT_NOTE: "note",
  newPayoutIdempotencyKey: (id: string) => `key-${id}`,
  getOrCreatePayoutAttemptIdempotencyKey: (id: string) => `key-${id}`,
  clearPayoutAttemptIdempotencyKey: vi.fn(),
  isLikelyUnknownPayoutNetworkOutcome: vi.fn(() => false),
  recordBonusPayoutFact: vi.fn().mockResolvedValue({ replay: false }),
}));

import { fetchSettlements } from "@/lib/settlements-loader";
import { recordBonusPayoutFact } from "@/lib/payout-record";
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

const payableRow = {
  id: "bonus-ledger-1",
  orderId: "order-ledger-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-ledger",
  counterpartyName: "Partner Ledger",
  amount: 900,
  basis: "Отделка",
  status: "CONFIRMED" as const,
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("WalletAccrualsWorkspace master-ledger payout refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce({
        coverageNote: "",
        receivable: [],
        payable: [payableRow],
        completed: [],
      })
      .mockResolvedValue({
        coverageNote: "",
        receivable: [],
        payable: [],
        completed: [],
      });
  });

  it("refreshes ledger row and shell totals after payout in subview", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsWorkspace scopeKey="ledger-refresh" masterLedger={{ ledgerScopeKey: "ledger-refresh:ledger" }} />,
    );
    await screen.findByTestId("wallet-accruals");
    await user.click(screen.getByTestId("wallet-direction-out"));
    expect(screen.getByTestId("wallet-rc-payable-face")).toHaveTextContent("900");

    await user.click(screen.getByTestId("wallet-open-master-ledger"));
    await screen.findByTestId("specialist-settlements-workspace");
    await user.click(screen.getByRole("button", { name: "Я должен" }));
    await user.click(screen.getByTestId("specialist-partner-group-cp-ledger"));
    await user.click(screen.getByTestId("specialist-settlements-record-payout-bonus-ledger-1"));
    await user.click(screen.getByRole("button", { name: /Подтвердить выплату наличными/i }));

    await waitFor(() => expect(recordBonusPayoutFact).toHaveBeenCalled());
    await waitFor(() => expect(fetchSettlements.mock.calls.length).toBeGreaterThanOrEqual(2));

    await user.click(screen.getByTestId("wallet-ledger-back"));
    await screen.findByTestId("wallet-accruals");
    await user.click(screen.getByTestId("wallet-direction-out"));
    await waitFor(() =>
      expect(screen.getByTestId("wallet-rc-payable-face")).toHaveTextContent("0"),
    );
  });
});
