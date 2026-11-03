import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/ui/Button.module.css", () => ({ default: { primary: "primary", secondary: "secondary" } }));
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
  getOrCreatePayoutAttemptIdempotencyKey: (id: string) => `stable-${id}`,
  clearPayoutAttemptIdempotencyKey: vi.fn(),
  isLikelyUnknownPayoutNetworkOutcome: vi.fn(() => false),
  recordBonusPayoutFact: vi.fn().mockResolvedValue({ replay: false }),
}));

const payableRow = {
  id: "bonus-focus-1",
  orderId: "order-focus-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner",
  amount: 900,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("WalletAccrualsShell payout focus restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns focus to history opener after payout cancel and success", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsShell
        data={{ receivable: [], payable: [payableRow], completed: [] }}
        presentation={{ ribbonLabel: "Кошелёк", cardIdentifier: null }}
      />,
    );

    await user.click(screen.getByTestId("wallet-direction-out"));
    const historyRow = screen.getByTestId("wallet-history-row-bonus-focus-1-confirmed");
    await user.click(historyRow);
    expect(document.activeElement).not.toBe(document.body);

    await user.click(screen.getByTestId("wallet-txn-record-payout-bonus-focus-1"));
    await screen.findByTestId("payout-record-modal");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => expect(screen.queryByTestId("payout-record-modal")).toBeNull());
    expect(document.activeElement).toBe(historyRow);

    await user.click(historyRow);
    await user.click(screen.getByTestId("wallet-txn-record-payout-bonus-focus-1"));
    await user.click(screen.getByRole("button", { name: /Подтвердить выплату наличными/i }));
    await waitFor(() => expect(screen.queryByTestId("payout-record-modal")).toBeNull());
    expect(document.activeElement).toBe(historyRow);
  });
});
