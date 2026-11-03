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

const recordBonusPayoutFact = vi.fn().mockResolvedValue({ replay: false });

vi.mock("@/lib/payout-record", () => ({
  payoutConfirmLabel: (m: string) =>
    m === "CASH" ? "Подтвердить выплату наличными" : "Подтвердить перевод",
  PAYOUT_EXTERNAL_FACT_NOTE: "note",
  newPayoutIdempotencyKey: (id: string) => `key-${id}`,
  getOrCreatePayoutAttemptIdempotencyKey: (id: string) => `stable-${id}`,
  clearPayoutAttemptIdempotencyKey: vi.fn(),
  resetPayoutAttemptIdempotencyKeysForTests: vi.fn(),
  isLikelyUnknownPayoutNetworkOutcome: vi.fn(() => false),
  recordBonusPayoutFact: (...args: unknown[]) => recordBonusPayoutFact(...args),
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
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

const payableRow = {
  id: "bonus-refresh-notice-1",
  orderId: "order-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner",
  amount: 900,
  basis: "Отделка",
  status: "CONFIRMED" as const,
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("WalletAccrualsWorkspace post-payout refetch notice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce({
        coverageNote: "",
        receivable: [],
        payable: [payableRow],
        completed: [],
      })
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue({
        coverageNote: "",
        receivable: [],
        payable: [payableRow],
        completed: [],
      });
  });

  it("keeps shell data and shows notice when refresh fails after payout", async () => {
    const user = userEvent.setup();
    render(<WalletAccrualsWorkspace scopeKey="refetch-notice" />);
    await screen.findByTestId("wallet-accruals");
    await user.click(screen.getByTestId("wallet-direction-out"));
    expect(screen.getByTestId("wallet-rc-payable-face")).toHaveTextContent("900");

    await user.click(screen.getByTestId("wallet-history-row-bonus-refresh-notice-1-confirmed"));
    await user.click(screen.getByTestId("wallet-txn-record-payout-bonus-refresh-notice-1"));
    await user.click(screen.getByRole("button", { name: /Подтвердить выплату наличными/i }));

    await waitFor(() => expect(recordBonusPayoutFact).toHaveBeenCalled());
    await screen.findByTestId("wallet-refresh-notice");
    expect(screen.getByTestId("wallet-refresh-notice")).toHaveTextContent(
      /Выплата записана, не удалось обновить данные/i,
    );
    expect(screen.queryByTestId("wallet-accruals-error")).toBeNull();
    expect(screen.getByTestId("wallet-rc-payable-face")).toHaveTextContent("900");
  });
});
