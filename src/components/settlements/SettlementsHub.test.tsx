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
      coverageNote: "Показаны взаиморасчёты по подтверждённым покупкам.",
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
        {
          id: "b5",
          orderId: "o5",
          accrualType: "bonus",
          counterpartyId: "pro-3",
          counterpartyName: "No Date",
          amount: 10,
          basis: "Сертификат RC-5",
          status: "PAID",
          createdAt: "2026-08-01T10:00:00.000Z",
          paidAt: null,
          direction: "receivable",
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
    expect(screen.getAllByText(/оплачено/i).length).toBeGreaterThan(0);
  });

  it("denies access for unrelated accounts", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(403, "Forbidden"));

    render(<SettlementsHub />);

    expect(
      await screen.findByText(/раздел взаиморасчётов недоступен/i),
    ).toBeInTheDocument();
  });

  it("summary tile switches receivable tab and search filters partners", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "b1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "a",
          counterpartyName: "Visible Partner",
          amount: 10,
          basis: "Сертификат A",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
        {
          id: "b2",
          orderId: "o2",
          accrualType: "bonus",
          counterpartyId: "b",
          counterpartyName: "Hidden Partner",
          amount: 20,
          basis: "Сертификат B",
          status: "CONFIRMED",
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });

    render(<SettlementsHub />);
    expect(await screen.findByText("Visible Partner")).toBeInTheDocument();
    expect(screen.getByText("Hidden Partner")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /я должен/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /мне должны/i, pressed: false }),
    );
    expect(screen.getByRole("button", { name: /мне должны/i, pressed: true })).toBeInTheDocument();

    await userEvent.click(screen.getByText(/поиск и фильтры/i));
    const search = screen.getByLabelText(/поиск по партнёру/i);
    await userEvent.clear(search);
    await userEvent.type(search, "Visible");
    expect(screen.getByText("Visible Partner")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Partner")).toBeNull();
  });

  it("keeps pending amounts out of receivable balance total tile value", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "b1",
          orderId: "o1",
          accrualType: "bonus",
          counterpartyId: "a",
          counterpartyName: "Shop",
          amount: 100,
          pendingAmount: 500,
          basis: "Сертификат",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub />);
    const tile = await screen.findByRole("button", { name: /мне должны/i });
    expect(tile).toHaveTextContent("100");
    expect(tile).toHaveTextContent("500");
  });

  it("uses two direction tiles and a separate completed history control", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [],
      completed: [{ id: "c1", orderId: "o1", accrualType: "bonus", counterpartyId: "x", counterpartyName: "Done", amount: 1, basis: "B", status: "PAID", createdAt: "2026-10-01T10:00:00.000Z", paidAt: "2026-10-02T10:00:00.000Z", direction: "receivable" }],
    });
    render(<SettlementsHub />);
    await screen.findByTestId("settlements-hub");
    expect(screen.getAllByRole("button", { name: /мне должны|я должен/i })).toHaveLength(2);
    expect(screen.getByTestId("settlements-completed-history")).toHaveTextContent("(1)");
    expect(screen.queryByRole("button", { name: /^завершённые$/i })).toBeNull();
  });

  it("uses certificate basis as row title instead of internal order id", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [
        {
          id: "b1",
          orderId: "internal-order-uuid",
          accrualType: "bonus",
          counterpartyId: "a",
          counterpartyName: "Shop",
          amount: 10,
          basis: "Сертификат RC-TITLE",
          status: "CONFIRMED",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      payable: [],
      completed: [],
    });
    render(<SettlementsHub />);
    expect(await screen.findByText("Сертификат RC-TITLE")).toBeInTheDocument();
    expect(screen.queryByText(/Заказ internal-order-uuid/i)).toBeNull();
  });
});
