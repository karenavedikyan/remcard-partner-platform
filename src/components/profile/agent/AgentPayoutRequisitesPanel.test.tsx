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
  version: 2,
};

const fullDetail = {
  ...listItem,
  accountNumber: "40817810000000000001",
  corrAccount: "30101810000000000000",
};

function fillValidCreateForm() {
  fireEvent.change(screen.getByTestId("bank-recipient"), { target: { value: "Parity Agent" } });
  fireEvent.change(screen.getByTestId("bank-bank"), { target: { value: "Тест" } });
  fireEvent.change(screen.getByTestId("bank-bik"), { target: { value: "044525225" } });
  fireEvent.change(screen.getByTestId("bank-account"), {
    target: { value: "40817810000000000001" },
  });
  fireEvent.change(screen.getByTestId("bank-correspondent"), {
    target: { value: "30101810000000000000" },
  });
}

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
    expect(screen.getByTestId("bank-status")).toHaveTextContent("");
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
    expect(screen.getByTestId("bank-status")).toHaveTextContent(/Скопировано в буфер/);
  });
});

describe("AgentPayoutRequisitesPanel create and revise payloads", () => {
  it("create sends normalized payload with isPrimary on first item", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    api.createAgentRequisites.mockResolvedValue({ item: listItem });
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Добавить реквизиты" }));
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await waitFor(() => expect(api.createAgentRequisites).toHaveBeenCalled());
    expect(api.createAgentRequisites.mock.calls[0][0]).toMatchObject({
      legalName: "Parity Agent",
      bik: "044525225",
      isPrimary: true,
    });
  });

  it("revise sends expectedVersion and empty inn/kpp strings to clear", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({
      item: { ...fullDetail, kind: "person", inn: "770708389312", kpp: null, version: 3 },
    });
    api.patchAgentRequisites.mockResolvedValue({ item: listItem });
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    await screen.findByTestId("agent-requisites-form");
    fireEvent.change(screen.getByTestId("bank-inn"), { target: { value: "" } });
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await waitFor(() => expect(api.patchAgentRequisites).toHaveBeenCalled());
    const body = api.patchAgentRequisites.mock.calls[0][1] as Record<string, unknown>;
    expect(body.action).toBe("revise");
    expect(body.expectedVersion).toBe(3);
    expect(body.inn).toBe("");
    expect(body.kpp).toBe("");
  });
});

describe("AgentPayoutRequisitesPanel conflict handling", () => {
  it("VERSION_CONFLICT resyncs version and keeps form open for retry", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites
      .mockResolvedValueOnce({ item: { ...fullDetail, version: 4 } })
      .mockResolvedValueOnce({ item: { ...fullDetail, version: 5 } });
    api.patchAgentRequisites
      .mockRejectedValueOnce(new RemcardApiError(409, "Conflict", { code: "VERSION_CONFLICT" }))
      .mockResolvedValueOnce({ item: listItem });
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    await screen.findByTestId("agent-requisites-form");
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByText(/Данные обновлены/);
    expect(screen.getByTestId("agent-requisites-form")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("bank-save"));
    await waitFor(() => expect(api.patchAgentRequisites).toHaveBeenCalledTimes(2));
    expect(api.patchAgentRequisites.mock.calls[1][1]).toMatchObject({ expectedVersion: 5 });
  });

  it("non-version 409 shows server message on revise", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: fullDetail });
    api.patchAgentRequisites.mockRejectedValue(
      new RemcardApiError(409, "ИНН/тип не совпадают с выбранной стороной — создайте новый набор"),
    );
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    await screen.findByTestId("agent-requisites-form");
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByText(/ИНН\/тип не совпадают/);
  });

  it("surfaces server field errors", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    api.createAgentRequisites.mockRejectedValue(
      new RemcardApiError(400, "Ошибка полей", { fields: { bik: "Неверный БИК" } }),
    );
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Добавить реквизиты" }));
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByText("Неверный БИК");
  });
});

describe("AgentPayoutRequisitesPanel wallet variant", () => {
  it("exposes edit, primary and archive for selected record", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem, secondItem] });
    render(<AgentPayoutRequisitesPanel variant="wallet" />);
    await screen.findByTestId("bank-wallet-more-actions");
    fireEvent.change(screen.getByTestId("bank-select"), { target: { value: "req-2" } });
    fireEvent.click(screen.getByText("Дополнительные действия"));
    expect(screen.getByRole("button", { name: "Изменить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сделать основными" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
  });

  it("disabled wallet still allows select and copy", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem, secondItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: fullDetail });
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<AgentPayoutRequisitesPanel variant="wallet" disabled />);
    await screen.findByText("Изменения недоступны");
    const select = screen.getByTestId("bank-select");
    expect(select).not.toBeDisabled();
    fireEvent.change(select, { target: { value: "req-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать реквизиты" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Дополнительные действия"));
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();
  });
});

describe("AgentPayoutRequisitesPanel profile variant", () => {
  it("normalizes masked account suffix in list line", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    render(<AgentPayoutRequisitesPanel variant="profile" />);
    await screen.findByTestId("bank-record");
    expect(screen.getByText(/счёт …0001/)).toBeInTheDocument();
    expect(screen.queryByText(/\*\*\*\*0001/)).not.toBeInTheDocument();
  });

  it("setPrimary calls patch on profile record", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem, secondItem] });
    api.patchAgentRequisites.mockResolvedValue({ item: secondItem });
    render(<AgentPayoutRequisitesPanel variant="profile" />);
    const records = await screen.findAllByTestId("bank-record");
    fireEvent.click(within(records[1]).getByText("Дополнительные действия"));
    fireEvent.click(within(records[1]).getByRole("button", { name: "Сделать основными" }));
    await waitFor(() =>
      expect(api.patchAgentRequisites).toHaveBeenCalledWith("req-2", { action: "setPrimary" }),
    );
  });
});

describe("AgentPayoutRequisitesPanel refresh UX", () => {
  it("keeps form mounted during list refresh after VERSION_CONFLICT", async () => {
    let resolveSlowList: (value: { items: typeof listItem[] }) => void = () => {};
    api.listAgentRequisites
      .mockResolvedValueOnce({ items: [listItem] })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSlowList = resolve;
          }),
      )
      .mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({ item: { ...fullDetail, version: 2 } });
    api.patchAgentRequisites.mockRejectedValue(
      new RemcardApiError(409, "Conflict", { code: "VERSION_CONFLICT" }),
    );
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    await screen.findByTestId("agent-requisites-form");
    fillValidCreateForm();
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByText("Обновление…");
    expect(screen.getByTestId("agent-requisites-form")).toBeInTheDocument();
    resolveSlowList({ items: [listItem] });
    await waitFor(() => expect(screen.queryByText("Обновление…")).not.toBeInTheDocument());
  });
});

describe("AgentPayoutRequisitesPanel validation", () => {
  it("requires company KPP with bank-error alert", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [] });
    render(<AgentPayoutRequisitesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Добавить реквизиты" }));
    fireEvent.change(screen.getByTestId("bank-type"), { target: { value: "company" } });
    fillValidCreateForm();
    fireEvent.change(screen.getByTestId("bank-inn"), { target: { value: "7707083893" } });
    fireEvent.click(screen.getByTestId("bank-save"));
    await screen.findByTestId("bank-error");
    expect(api.createAgentRequisites).not.toHaveBeenCalled();
  });
});
