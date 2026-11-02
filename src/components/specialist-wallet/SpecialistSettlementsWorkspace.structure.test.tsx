import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistSettlementsWorkspace } from "./SpecialistSettlementsWorkspace";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

describe("SpecialistSettlementsWorkspace structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows technical order identifiers in card details for large density", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "acc-1",
          orderId: "order-tech-1",
          accrualType: "bonus",
          counterpartyId: "cp-1",
          counterpartyName: "Partner",
          amount: 50,
          basis: "Сертификат RC-CARD",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });

    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-wallet-receivable-total");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("specialist-wallet-receivable-total"));
    await user.click(screen.getByTestId("specialist-partner-group-cp-1"));
    await user.click(screen.getByText(/поиск и фильтры/i));
    await user.selectOptions(screen.getByLabelText("Представление"), "cards");
    expect(await screen.findByText(/order-tech-1/)).toBeInTheDocument();
    expect(screen.getByText(/acc-1/)).toBeInTheDocument();
    expect(screen.queryByText(/^Заказ order-tech-1$/)).toBeNull();
  });

  it("does not show zero debt in focus header for completed-only partners", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [
        {
          id: "done-1",
          orderId: "o-done",
          accrualType: "bonus",
          counterpartyId: "closed-only",
          counterpartyName: "Closed Partner",
          amount: 40,
          basis: "Сертификат RC-D",
          status: "PAID",
          createdAt: "2026-09-01T10:00:00.000Z",
          paidAt: "2026-10-01T10:00:00.000Z",
          direction: "receivable",
        },
      ],
    });

    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-wallet-receivable-total");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("specialist-wallet-receivable-total"));
    await user.click(screen.getByText(/поиск и фильтры/i));
    await user.selectOptions(screen.getByLabelText("Статус"), "all");
    await user.click(screen.getByTestId("specialist-partner-group-closed-only"));
    expect(await screen.findByText(/только история/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 ₽/)).toBeNull();
  });
});
