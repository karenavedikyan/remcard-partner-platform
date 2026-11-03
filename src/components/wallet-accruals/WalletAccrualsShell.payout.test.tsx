import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/ui/Button.module.css", () => ({ default: { primary: "primary" } }));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));

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

vi.mock("@/components/payout/PayoutRecordModal", () => ({
  PayoutRecordModal: () => (
    <div data-testid="payout-record-modal">
      <h2>Зафиксировать выплату</h2>
      <button type="button">Подтвердить выплату наличными</button>
    </div>
  ),
}));

const payableRow = {
  id: "bonus-shell-1",
  orderId: "order-shell-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner",
  amount: 900,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("WalletAccrualsShell payout from txn panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes native dialog before payout modal so form is clickable", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsShell
        data={{
          receivable: [],
          payable: [payableRow],
          completed: [],
        }}
        presentation={{ ribbonLabel: "Кошелёк", cardIdentifier: null }}
      />,
    );

    await user.click(screen.getByTestId("wallet-direction-out"));
    await user.click(screen.getByTestId("wallet-history-row-bonus-shell-1-confirmed"));
    expect(screen.getByTestId("wallet-txn-panel")).toBeInTheDocument();

    await user.click(screen.getByTestId("wallet-txn-record-payout-bonus-shell-1"));
    await waitFor(() => expect(screen.getByTestId("payout-record-modal")).toBeVisible());
    expect(screen.queryByTestId("wallet-txn-panel")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Подтвердить выплату наличными/i }));
  });

  it("resets dialog state when scopeKey changes during refresh", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <WalletAccrualsShell
        scopeKey="a"
        data={{ receivable: [payableRow], payable: [], completed: [] }}
        presentation={{ ribbonLabel: "Кошелёк", cardIdentifier: null }}
      />,
    );
    await user.click(screen.getByTestId("wallet-history-row-bonus-shell-1-confirmed"));
    expect(screen.getByTestId("wallet-txn-panel")).toBeInTheDocument();
    rerender(
      <WalletAccrualsShell
        scopeKey="b"
        data={{ receivable: [payableRow], payable: [], completed: [] }}
        presentation={{ ribbonLabel: "Кошелёк", cardIdentifier: null }}
      />,
    );
    await waitFor(() => expect(screen.queryByTestId("wallet-txn-panel")).toBeNull());
  });
});
