import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { AgentPayoutRequisitesPanel } from "./AgentPayoutRequisitesPanel";

const api = vi.hoisted(() => ({
  listAgentRequisites: vi.fn(),
  fetchAgentRequisites: vi.fn(),
  createAgentRequisites: vi.fn(),
  patchAgentRequisites: vi.fn(),
}));
vi.mock("@/lib/agent-profile/api", () => api);

const listItem = {
  id: "req-1",
  kind: "person",
  label: "Личный счёт",
  legalName: "Parity Agent",
  inn: "770708389312",
  kpp: null,
  bankName: "Тест",
  bik: "044525225",
  accountNumberMasked: "****0001",
  corrAccountMasked: "****0000",
  isPrimary: true,
  applyForNextPayout: false,
  isArchived: false,
  version: 1,
};

const secondItem = {
  id: "req-2",
  kind: "ip",
  label: "Рабочий",
  legalName: "ИП Agent",
  inn: "770708389312",
  kpp: null,
  bankName: "Сбер",
  bik: "044525225",
  accountNumberMasked: "****0042",
  corrAccountMasked: "****0000",
  isPrimary: false,
  applyForNextPayout: false,
  isArchived: false,
  version: 1,
};

const fullDetail = {
  ...listItem,
  accountNumber: "40817810000000000001",
  corrAccount: "30101810000000000000",
};

beforeEach(() => {
  api.listAgentRequisites.mockResolvedValue({ items: [] });
  api.fetchAgentRequisites.mockReset();
  api.createAgentRequisites.mockReset();
  api.patchAgentRequisites.mockReset();
});

afterEach(cleanup);

describe("AgentPayoutRequisitesPanel copy", () => {
  it("errors when authorized detail fetch fails (no masked fallback copy)", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockRejectedValue(new RemcardApiError(500, "Server error"));
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Скопировать" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать" }));
    await screen.findByText(/Не удалось загрузить полные реквизиты/);
    expect(screen.queryByText(/Скопировано в буфер/)).not.toBeInTheDocument();
  });

  it("copies full text when detail returns unmasked account", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: fullDetail });
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Скопировать" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    const text = write.mock.calls[0][0] as string;
    expect(text).toContain("Parity Agent");
    expect(text).toContain("40817810000000000001");
    expect(text).not.toContain("****");
  });
});

describe("AgentPayoutRequisitesPanel validation", () => {
  it("does not call API when client validation fails", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Добавить реквизиты" });
    fireEvent.click(screen.getByRole("button", { name: "Добавить реквизиты" }));
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByTestId("bank-error");
    expect(api.createAgentRequisites).not.toHaveBeenCalled();
  });

  it("requires company KPP before submit", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Добавить реквизиты" });
    fireEvent.click(screen.getByRole("button", { name: "Добавить реквизиты" }));
    fireEvent.change(screen.getByTestId("bank-type"), { target: { value: "company" } });
    fireEvent.change(screen.getByTestId("bank-recipient"), { target: { value: "ООО Тест" } });
    fireEvent.change(screen.getByTestId("bank-bank"), { target: { value: "Банк" } });
    fireEvent.change(screen.getByTestId("bank-bik"), { target: { value: "044525225" } });
    fireEvent.change(screen.getByTestId("bank-account"), {
      target: { value: "40702810000000000001" },
    });
    fireEvent.change(screen.getByTestId("bank-correspondent"), {
      target: { value: "30101810000000000000" },
    });
    fireEvent.change(screen.getByTestId("bank-inn"), { target: { value: "7707083893" } });
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByTestId("bank-error");
    expect(api.createAgentRequisites).not.toHaveBeenCalled();
  });
});

describe("AgentPayoutRequisitesPanel wallet variant", () => {
  it("renders wallet heading and bank select", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem, secondItem] });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    await screen.findByText("Куда получать оплату");
    expect(screen.getByTestId("bank-select")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("local select change does not call apply API", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem, secondItem] });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    const select = await screen.findByTestId("bank-select");
    fireEvent.change(select, { target: { value: "req-2" } });
    expect(api.patchAgentRequisites).not.toHaveBeenCalled();
    expect(screen.getByText("Рабочий")).toBeInTheDocument();
  });

  it("shows apply success from reload-derived applyForNextPayout flag", async () => {
    api.listAgentRequisites.mockResolvedValue({
      items: [{ ...listItem, applyForNextPayout: true }],
    });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    await screen.findByTestId("bank-apply-success");
    expect(screen.getByText(/Для следующего расчёта выбраны: Личный счёт/)).toBeInTheDocument();
  });

  it("apply for next payout calls patch and reloads flag", async () => {
    api.listAgentRequisites
      .mockResolvedValueOnce({ items: [listItem, secondItem] })
      .mockResolvedValueOnce({ items: [{ ...secondItem, applyForNextPayout: true }, listItem] });
    api.patchAgentRequisites.mockResolvedValue({ item: { ...secondItem, applyForNextPayout: true } });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    const select = await screen.findByTestId("bank-select");
    fireEvent.change(select, { target: { value: "req-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Применить для следующего расчёта" }));
    await waitFor(() =>
      expect(api.patchAgentRequisites).toHaveBeenCalledWith("req-2", { action: "applyForNextPayout" }),
    );
    await screen.findByTestId("bank-apply-success");
  });
});

describe("AgentPayoutRequisitesPanel profile variant", () => {
  it("keeps ul list and bank-record test ids", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    render(<AgentPayoutRequisitesPanel variant="profile" />);
    await screen.findByTestId("bank-record");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Реквизиты для получения оплаты")).toBeInTheDocument();
  });
});

describe("AgentPayoutRequisitesPanel disabled and conflicts", () => {
  it("disables mutating controls when disabled", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    render(<AgentPayoutRequisitesPanel disabled />);
    await screen.findByText("Только просмотр");
    expect(screen.getByRole("button", { name: "Скопировать" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Добавить ещё реквизиты" })).toBeDisabled();
  });

  it("surfaces version conflict on revise", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: fullDetail });
    api.patchAgentRequisites.mockRejectedValue(new RemcardApiError(409, "Conflict"));
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Изменить" });
    fireEvent.click(screen.getByRole("button", { name: "Изменить" }));
    await screen.findByTestId("agent-requisites-form");
    fireEvent.change(screen.getByTestId("bank-recipient"), { target: { value: "Parity Agent" } });
    fireEvent.change(screen.getByTestId("bank-bank"), { target: { value: "Тест" } });
    fireEvent.change(screen.getByTestId("bank-bik"), { target: { value: "044525225" } });
    fireEvent.change(screen.getByTestId("bank-account"), {
      target: { value: "40817810000000000001" },
    });
    fireEvent.change(screen.getByTestId("bank-correspondent"), {
      target: { value: "30101810000000000000" },
    });
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByText(/изменены в другом окне/);
  });

  it("Escape closes form and returns focus", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    render(<AgentPayoutRequisitesPanel />);
    const add = await screen.findByRole("button", { name: "Добавить реквизиты" });
    fireEvent.click(add);
    await screen.findByTestId("agent-requisites-form");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("agent-requisites-form")).not.toBeInTheDocument());
  });

  it("archive confirms and calls patch", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.patchAgentRequisites.mockResolvedValue({ item: listItem });
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByText("Дополнительные действия");
    fireEvent.click(screen.getByText("Дополнительные действия"));
    fireEvent.click(screen.getByRole("button", { name: "Архивировать" }));
    await waitFor(() =>
      expect(api.patchAgentRequisites).toHaveBeenCalledWith("req-1", { action: "archive" }),
    );
  });
});

describe("AgentPayoutRequisitesPanel detail", () => {
  it("loads detail on expand and shows copy fallback when clipboard fails", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: fullDetail });
    const write = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    await screen.findByRole("button", { name: "Посмотреть полностью" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать реквизиты" }));
    await screen.findByText(/Скопируйте текст вручную/);
    const fallback = screen.getByLabelText("Реквизиты для ручного копирования");
    expect(fallback).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть полностью" }));
    await screen.findByTestId("bank-record-detail");
    expect(within(screen.getByTestId("bank-record-detail")).getByTestId("bank-detail-inn")).toHaveTextContent(
      "770708389312",
    );
  });
});
