import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { profDemoListResponse } from "@/lib/clients-parity/prof-appeals-demo-fixtures";
import { ReceivingAppealsProfTable } from "./ReceivingAppealsProfTable";

describe("ReceivingAppealsProfTable — p149", () => {
  it("keeps existing controls and shows date, amount and referrer when supplied", () => {
    const data = profDemoListResponse();
    const row = {
      ...data.profAppeals[0],
      originKind: "CERTIFICATE" as const,
      createdAt: "2026-11-01T10:00:00Z",
      paidAmountKopecks: 18900000,
      referrerDisplayName: "Мария Орлова",
      erpDocumentNumber: "1C-2408",
    };
    render(<ReceivingAppealsProfTable data={data} profRows={[row]} filters={{ q: "", status: "Все статусы", source: "all", bucket: "active" }} onFiltersChange={() => {}} />);
    expect(screen.getByText(/Создано: 1 нояб/)).toBeInTheDocument();
    expect(screen.getByTestId("ca-prof-paid-amount")).toHaveTextContent(/189\s000/);
    expect(screen.getByText("Направил: Мария Орлова")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Источники" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Копировать Номер заказа в 1С" })).toBeInTheDocument();
  });

  it("distinguishes an empty archive from a search with zero matches", async () => {
    const user = userEvent.setup();
    const data = profDemoListResponse();
    const onFiltersChange = vi.fn();
    const filters = { q: "", status: "Все статусы", source: "all" as const, bucket: "archive" as const };
    const props = { data, profRows: [], onFiltersChange };
    const screenState = render(<ReceivingAppealsProfTable {...props} filters={filters} />);
    expect(screen.getByRole("heading", { name: "В архиве пока пусто" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "К активным" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, bucket: "active" });
    screenState.rerender(<ReceivingAppealsProfTable {...props} filters={{ ...filters, q: "Не найдено" }} />);
    expect(screen.getByRole("heading", { name: "По выбранным фильтрам обращений нет" })).toBeInTheDocument();
  });
  it("shows remCard filter count from server and filters rows client-side", async () => {
    const user = userEvent.setup();
    const data = profDemoListResponse();
    render(
      <ReceivingAppealsProfTable
        data={data}
        profRows={data.profAppeals}
        remCardMatchCount={data.remCardMatchCount}
        filters={{
          q: "",
          status: "Все статусы",
          source: "all",
          bucket: "active",
          remCardOnly: false,
          requestFilter: "Все",
          appealSourceKey: "all",
        }}
        onFiltersChange={() => {}}
        onOpenAppeal={() => {}}
      />,
    );
    expect(screen.getByTestId("ca-remcard-filter")).toHaveTextContent("1");
    expect(screen.getAllByTestId(/ca-prof-row-/).length).toBeGreaterThan(1);
    await user.click(screen.getByRole("checkbox", { name: /Только клиенты с RemCard/ }));
  });

  it("marks cabinet only on confirmed remCard.inCabinet", () => {
    const data = profDemoListResponse();
    render(
      <ReceivingAppealsProfTable
        data={data}
        profRows={data.profAppeals}
        remCardMatchCount={1}
        filters={{
          q: "",
          status: "Все статусы",
          source: "all",
          bucket: "active",
        }}
        onFiltersChange={() => {}}
        onOpenAppeal={() => {}}
      />,
    );
    const withCabinet = screen.getAllByTestId("ca-prof-account").find((el) =>
      el.textContent?.includes("Есть в RemCard"),
    );
    expect(withCabinet).toBeDefined();
    expect(screen.getByText("Отделка прихожей")).toBeInTheDocument();
  });
});
