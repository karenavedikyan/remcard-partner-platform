import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettlementsHub } from "./SettlementsHub";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

describe("SettlementsHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows API error with retry instead of zero balances", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(500, "Сбой сервера"));

    render(<SettlementsHub />);

    expect(await screen.findByText(/сбой сервера/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /повторить/i })).toBeInTheDocument();
    expect(screen.queryByText(/0 ₽/)).toBeNull();
  });

  it("shows both directions grouped by partner and completed tab", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
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
        {
          id: "b2",
          orderId: "o2",
          accrualType: "agentBonus",
          counterpartyId: "store-1",
          counterpartyName: "Alpha Shop",
          amount: 50,
          basis: "Сертификат RC-2",
          status: "CALCULATED",
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ],
      payable: [
        {
          id: "b3",
          orderId: "o3",
          accrualType: "bonus",
          counterpartyId: "pro-1",
          counterpartyName: "Master Pro",
          amount: 80,
          basis: "Сертификат RC-3",
          status: "CONFIRMED",
          createdAt: "2026-10-03T10:00:00.000Z",
        },
      ],
      completed: [
        {
          id: "b4",
          orderId: "o4",
          accrualType: "bonus",
          counterpartyId: "pro-2",
          counterpartyName: "Paid Partner",
          amount: 200,
          basis: "Сертификат RC-4",
          status: "PAID",
          createdAt: "2026-09-01T10:00:00.000Z",
          paidAt: "2026-09-05T10:00:00.000Z",
          direction: "payable",
        },
      ],
    });

    render(<SettlementsHub />);

    expect(await screen.findByText(/Alpha Shop/)).toBeInTheDocument();
    expect(screen.getAllByText(/150 ₽/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Alpha Shop/)).toBeInTheDocument();
    expect(screen.getByText(/80 ₽/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /я должен/i }));
    expect(screen.getByText(/Master Pro/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /завершённые/i }));
    expect(screen.getByText(/Paid Partner/)).toBeInTheDocument();
    expect(screen.getByText(/оплачено/i)).toBeInTheDocument();
  });

  it("denies access for unrelated accounts", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(403, "Forbidden"));

    render(<SettlementsHub />);

    expect(
      await screen.findByText(/раздел взаиморасчётов недоступен/i),
    ).toBeInTheDocument();
  });
});
