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
});