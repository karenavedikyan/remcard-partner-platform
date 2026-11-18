import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));

const FORBIDDEN = /order-linked|legacy|certificatePartner|R0\d|principal agent/i;

const AGENT_NOTE =
  "Показаны взаиморасчёты по подтверждённым покупкам (order-linked). Начисления без связи с покупкой и legacy-заказы без certificatePartner не включены. R05: для principal agent скрыты исходящие обязательства и действия выплаты.";

const receivableRow = {
  id: "bonus-recv-1",
  orderId: "order-recv-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner In",
  amount: 1500,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
};

describe("agent wallet output (v9.2 F3)", () => {
  it("shows plain Russian only: no order-linked, legacy, certificatePartner, R05, principal agent", () => {
    const { container } = render(
      <WalletAccrualsShell
        data={{ receivable: [receivableRow], payable: [], completed: [] }}
        incomingOnly
        coverageNote={AGENT_NOTE}
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
      />,
    );
    const note = screen.getByTestId("wallet-coverage-note");
    expect(note.textContent).toContain("Показаны расчёты по подтверждённым покупкам.");
    expect(container.textContent ?? "").not.toMatch(FORBIDDEN);
  });

  it("renders no note at all when only technical text arrives", () => {
    render(
      <WalletAccrualsShell
        data={{ receivable: [receivableRow], payable: [], completed: [] }}
        incomingOnly
        coverageNote="R05: incoming-only view"
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
      />,
    );
    expect(screen.queryByTestId("wallet-coverage-note")).toBeNull();
  });
});
