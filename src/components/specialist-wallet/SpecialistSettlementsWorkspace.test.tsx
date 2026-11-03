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
    expect(await screen.findByText(/^Я должен$/)).toBeInTheDocument();
    expect(screen.getByText("Beta Pro")).toBeInTheDocument();
    expect(screen.queryByText(/завершённые/i)).toBeNull();
  });

  it("shows period validation error without treating it as empty data", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
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
      payable: [],
      completed: [],
    });
    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-settlements-workspace");
    const user = userEvent.setup();
    await user.click(screen.getByText(/поиск и фильтры/i));
    const from = screen.getByLabelText("Период с");
    const to = screen.getByLabelText("Период по");
    await user.clear(from);
    await user.type(from, "2026-10-20");
    await user.clear(to);
    await user.type(to, "2026-10-01");
    expect(await screen.findByRole("alert")).toHaveTextContent(/не может быть позже/i);
  });

  it("shows partner record count on partner compact row", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
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
          accrualType: "bonus",
          counterpartyId: "store-1",
          counterpartyName: "Alpha Shop",
          amount: 50,
          basis: "Сертификат RC-2",
          status: "CONFIRMED",
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });

    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-wallet-receivable-total");
    await userEvent.click(screen.getByTestId("specialist-wallet-receivable-total"));
    expect(await screen.findByText(/2 начисления/i)).toBeInTheDocument();
  });

  it("shows new-partner empty onboarding on successful zero ledger", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SpecialistSettlementsWorkspace walletEmptyViewerRole="specialist" />);
    expect(await screen.findByTestId("wallet-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("specialist-wallet-receivable-total")).toBeNull();
  });

  it("keeps legacy ledger chrome when viewer role is omitted on zero payload", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [],
    });
    render(<SpecialistSettlementsWorkspace />);
    expect(await screen.findByTestId("specialist-wallet-receivable-total")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("keeps ledger UI when completed history exists", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [
        {
          id: "c1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "p1",
          counterpartyName: "Partner",
          amount: 10,
          basis: "b",
          status: "PAID",
          createdAt: "2026-10-01T10:00:00.000Z",
          paidAt: "2026-10-02T10:00:00.000Z",
          direction: "receivable",
        },
      ],
    });
    render(<SpecialistSettlementsWorkspace />);
    expect(await screen.findByTestId("specialist-wallet-receivable-total")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
  });

  it("uses user-facing copy without paidAt jargon when ledger has rows", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "b1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "store-1",
          counterpartyName: "Alpha Shop",
          amount: 1,
          basis: "Сертификат RC-1",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });
    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-settlements-workspace");
    expect(
      screen.getByText(/подтверждение получения вторым участником/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/paidAt/i)).toBeNull();
    expect(screen.queryByText(/legacy PAID/i)).toBeNull();
  });
});
