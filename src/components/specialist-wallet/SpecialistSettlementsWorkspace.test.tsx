import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistSettlementsWorkspace } from "./SpecialistSettlementsWorkspace";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

describe("SpecialistSettlementsWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error with retry instead of zero balances", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(500, "Сбой сервера"));

    render(<SpecialistSettlementsWorkspace />);

    expect(await screen.findByText(/сбой сервера/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /повторить/i })).toBeInTheDocument();
    expect(screen.queryByTestId("specialist-wallet-receivable-total")).toBeNull();
  });

  it("shows separate receivable and payable totals and drill-down", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "Только подтверждённые покупки.",
      receivable: [
        {
          id: "b1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "store-1",
          counterpartyName: "Alpha Shop",
          amount: 100,
          basis: "Сертификат RC-1",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [
        {
          id: "b2",
          orderId: "o2",
          accrualType: "bonus",
          counterpartyId: "pro-1",
          counterpartyName: "Beta Pro",
          amount: 40,
          basis: "Сертификат RC-2",
          status: "CONFIRMED",
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ],
      completed: [],
    });

    render(<SpecialistSettlementsWorkspace />);

    expect(await screen.findByTestId("specialist-wallet-receivable-total")).toHaveTextContent(
      /100/,
    );
    expect(screen.getByTestId("specialist-wallet-payable-total")).toHaveTextContent(/40/);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("specialist-wallet-payable-total"));
    expect(await screen.findByRole("heading", { name: /я должен/i })).toBeInTheDocument();
    expect(screen.getByText("Beta Pro")).toBeInTheDocument();
  });
});
