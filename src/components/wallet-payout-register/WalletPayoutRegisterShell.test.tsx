import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletPayoutRegisterShell } from "./WalletPayoutRegisterShell";
import type { WalletPayoutRegisterResponse } from "@/lib/wallet-payout-register/types";

vi.mock("./wallet-payout-register.module.css", () => ({ default: {} }));
vi.mock("../wallet-accruals/wallet-accruals.global.css", () => ({}));

const mockData: WalletPayoutRegisterResponse = {
  incomingOnly: false,
  readOnly: false,
  canReceive: true,
  canPayout: true,
  totals: { inKopecks: 890_000, outKopecks: 480_000 },
  partners: [
    {
      counterpartyId: "cp-1",
      counterpartyName: "Дом материалов",
      branchLabel: null,
      direction: "in",
      readyKopecks: 500_000,
      pending: { requestId: "req-1", amountKopecks: 200_000, status: "waiting" },
      lastReceipt: null,
    },
    {
      counterpartyId: "cp-2",
      counterpartyName: "Плитка и стиль",
      branchLabel: null,
      direction: "in",
      readyKopecks: 240_000,
      pending: null,
      lastReceipt: null,
    },
  ],
  receipts: [],
};

const mockWithReceipt: WalletPayoutRegisterResponse = {
  ...mockData,
  receipts: [
    {
      receiptId: "rcpt-out-1",
      requestId: "req-old",
      counterpartyId: "cp-out",
      counterpartyName: "Списание тест",
      amountKopecks: 50_000,
      confirmedAt: new Date().toISOString(),
      direction: "out",
    },
    {
      receiptId: "rcpt-in-1",
      requestId: "req-in",
      counterpartyId: "cp-1",
      counterpartyName: "Дом материалов",
      amountKopecks: 30_000,
      confirmedAt: new Date().toISOString(),
      direction: "in",
    },
  ],
};

describe("WalletPayoutRegisterShell", () => {
  it("renders card total and partner row actions", async () => {
    const user = userEvent.setup();
    render(
      <WalletPayoutRegisterShell
        data={mockData}
        presentation={{ ribbonLabel: "Компания", cardIdentifier: null }}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Выплаты")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-payout-card")).toHaveTextContent("8 900");
    expect(screen.getByText("Дом материалов")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить сумму" })).toBeInTheDocument();

    await user.click(screen.getByTestId("wallet-payout-direction-out"));
    expect(screen.getByTestId("wallet-payout-direction-out")).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps manual incoming tab after outgoing receipt deep link", async () => {
    const user = userEvent.setup();
    render(
      <WalletPayoutRegisterShell
        data={mockWithReceipt}
        presentation={{ ribbonLabel: "Компания", cardIdentifier: null }}
        onRefresh={vi.fn()}
        initialReceiptId="rcpt-out-1"
      />,
    );
    expect(screen.getByTestId("wallet-payout-direction-out")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("wallet-payout-direction-in"));
    expect(screen.getByTestId("wallet-payout-direction-in")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("wallet-payout-direction-out")).toHaveAttribute("aria-pressed", "false");
  });

  it("focuses exact outgoing receipt from link", () => {
    render(
      <WalletPayoutRegisterShell
        data={mockWithReceipt}
        presentation={{ ribbonLabel: "Компания", cardIdentifier: null }}
        onRefresh={vi.fn()}
        initialReceiptId="rcpt-out-1"
      />,
    );
    expect(screen.getByTestId("wallet-payout-receipt-rcpt-out-1")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-payout-direction-out")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows inaccessible notice for unknown receipt", () => {
    render(
      <WalletPayoutRegisterShell
        data={mockData}
        presentation={{ ribbonLabel: "Компания", cardIdentifier: null }}
        onRefresh={vi.fn()}
        initialReceiptId="missing-rcpt"
      />,
    );
    expect(screen.getByTestId("wallet-payout-focus-notice")).toHaveTextContent("Квитанция недоступна");
  });

  it("agent incoming-only ignores outgoing receipt deep link", () => {
    render(
      <WalletPayoutRegisterShell
        data={{
          ...mockWithReceipt,
          incomingOnly: true,
          receipts: mockWithReceipt.receipts.filter((r) => r.direction === "in"),
        }}
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
        onRefresh={vi.fn()}
        initialReceiptId="rcpt-out-1"
      />,
    );
    expect(screen.getByTestId("wallet-payout-focus-notice")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-payout-receipt-rcpt-out-1")).not.toBeInTheDocument();
  });
});