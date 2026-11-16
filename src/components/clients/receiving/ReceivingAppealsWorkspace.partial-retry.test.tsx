import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

/** Prototype bar markup: `Выбрано: <strong>N</strong>` — match the whole counter text. */
const selectedCount = (n: number) =>
  screen.getByText((_, el) => el?.classList.contains("ca-bulk-count") === true && el.textContent === `Выбрано: ${n}`);

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const ids = ["receiving-one", "receiving-two"];
const at = "2026-11-14T18:40:00.000Z";
const settings = { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] };

function row(id: string) {
  return {
    id, clientDisplayName: `Синтетический ${id}`, receivingPartnerUserId: "receiver",
    stageKey: "sys_new", originKind: "manual", createdAt: at, updatedAt: at,
  };
}

function list(activeIds = ids) {
  return { appeals: activeIds.map(row), readOnly: false, nextCursor: null, tab: "active" };
}

function batch(updated: string[], failed: string[]) {
  return {
    action: "archive", updatedIds: updated, skippedIds: failed,
    failures: failed.map((id) => ({ id, code: "CONFLICT", message: "Конфликт версии" })),
  };
}

function writes() {
  return api.mock.calls.filter(([, options]) =>
    options?.method === "POST" || options?.method === "PATCH");
}

function listReads() {
  return api.mock.calls.filter(([path]) => path.split("?")[0] === "/api/pro/client-appeals");
}

function installTransport(options: {
  refreshError?: number;
  holdRefresh?: Promise<ReturnType<typeof list>>;
  edit?: boolean;
  full?: boolean;
  mutationError?: boolean;
  readOnlyAfterRecovery?: boolean;
  holdBatch?: Promise<void>;
}) {
  let mutated = false;
  let refreshError = options.refreshError;
  let held = options.holdRefresh;
  let batchCount = 0;
  const patchCounts: Record<string, number> = {};
  const active = new Set(ids);
  api.mockImplementation(async (path, request) => {
    if (path === "/api/pro/client-appeals/working-stages") return settings as never;
    if (path === "/api/pro/client-appeals/batch" && request?.method === "POST") {
      if (options.holdBatch) await options.holdBatch;
      if (options.mutationError) throw new TypeError("Synthetic network failure");
      batchCount += 1;
      mutated = true;
      if (options.full) {
        active.clear();
        return batch(ids, []) as never;
      }
      if (batchCount === 1) {
        active.delete(ids[0]);
        return batch([ids[0]], [ids[1]]) as never;
      }
      active.delete(ids[1]);
      return batch([ids[1]], []) as never;
    }
    if (path.startsWith("/api/pro/client-appeals?") || path === "/api/pro/client-appeals") {
      if (mutated && refreshError) throw new RemcardApiError(refreshError, "Синтетическая ошибка обновления");
      if (mutated && held) {
        const result = held;
        held = undefined;
        return await result as never;
      }
      return {
        ...list(options.edit ? ids : [...active]),
        readOnly: Boolean(options.readOnlyAfterRecovery && mutated && !refreshError),
      } as never;
    }
    const id = ids.find((value) => path === `/api/pro/client-appeals/${value}`);
    if (id && request?.method === "PATCH") {
      patchCounts[id] = (patchCounts[id] ?? 0) + 1;
      if (id === ids[1] && patchCounts[id] === 1) {
        throw new RemcardApiError(409, "Конфликт версии");
      }
      mutated = true;
      return { ok: true } as never;
    }
    if (id && !request?.method) {
      return {
        appeal: { ...row(id), privateNotes: "Старая заметка" },
        revision: id === ids[1] && patchCounts[id] ? 7 : 3,
      } as never;
    }
    throw new Error(`Unexpected synthetic request: ${request?.method ?? "GET"} ${path}`);
  });
  return {
    recover: () => { refreshError = undefined; },
    deny: (status: number) => { refreshError = status; },
  };
}

async function openBulk(kind: "archive" | "edit" = "archive") {
  const user = userEvent.setup();
  render(<ReceivingAppealsWorkspace />);
  await user.click(await screen.findByRole("checkbox", { name: "Все найденные (2)" }));
  await user.click(screen.getByRole("button", { name: kind === "archive" ? "В архив" : "Редактировать" }));
  return user;
}

beforeEach(() => { api.mockReset(); });

describe("Receiving workspace: независимая приёмка partial/retry", () => {
  it("обычный partial перечитывает список и повторяет только неуспешный ID", async () => {
    installTransport({});
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument());
    expect(selectedCount(1)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument());
    expect(writes()).toHaveLength(2);
    expect(writes()[1][1]?.body).toEqual({ action: "archive", ids: [ids[1]] });
  });

  it("после partial и GET 503 сохраняет подтверждение и выбор, ручное обновление делает только GET", async () => {
    const transport = installTransport({ refreshError: 503 });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument());
    expect(selectedCount(1)).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
    for (const checkbox of within(screen.getByTestId("ca-receiving-appeals-list")).getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "Сбросить выбор" })).toBeDisabled();
    transport.recover();
    await user.click(screen.getByRole("button", { name: /Повторить обновление/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(writes()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Сбросить выбор" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1][1]?.body).toEqual({ action: "archive", ids: [ids[1]] });
  });

  it("не разрешает второй POST, пока перечитывание после первого ещё выполняется", async () => {
    let release!: (value: ReturnType<typeof list>) => void;
    const deferred = new Promise<ReturnType<typeof list>>((resolve) => { release = resolve; });
    installTransport({ holdRefresh: deferred });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const confirm = within(screen.getByTestId("ca-receiving-bulk-confirm")).getAllByRole("button")[1];
    try {
      expect(confirm).toBeDisabled();
      await user.click(confirm);
      expect(writes()).toHaveLength(1);
    } finally {
      release(list([ids[1]]));
    }
    await waitFor(() => expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument());
  });

  it("после partial PATCH и GET 503 сохраняет draft и append-флаг, не повторяет успешный PATCH", async () => {
    const transport = installTransport({ refreshError: 503, edit: true });
    const user = await openBulk("edit");
    await user.type(screen.getByRole("textbox", { name: "Служебная заметка" }), "Новый текст");
    await user.click(screen.getByRole("checkbox", { name: "Добавить к существующей заметке" }));
    await user.click(screen.getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Служебная заметка" })).toHaveValue("Новый текст"));
    await waitFor(() => expect(selectedCount(1)).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Добавить к существующей заметке" })).not.toBeChecked();
    expect(writes()).toHaveLength(2);
    transport.recover();
    await user.click(screen.getByRole("button", { name: /Повторить обновление/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(writes()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(writes()).toHaveLength(3));
    expect(writes()[2][0]).toBe(`/api/pro/client-appeals/${ids[1]}`);
    expect(writes()[2][1]?.body).toEqual({ privateNotes: "Новый текст", expectedRevision: 7 });
  });

  it.each([401, 403])("GET %s после мутации не оставляет старый write UI", async (status) => {
    installTransport({ refreshError: status });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(await screen.findByTestId("ca-receiving-appeals-error")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it("повторная ошибка GET не отправляет мутацию и сохраняет оставшееся подтверждение", async () => {
    installTransport({ refreshError: 503 });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    await user.click(retry);
    await waitFor(() => expect(screen.getByRole("button", { name: /Повторить обновление/ })).toBeEnabled());
    expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
    const confirm = within(screen.getByTestId("ca-receiving-bulk-confirm")).getAllByRole("button")[1];
    expect(confirm).toBeDisabled();
  });

  it("полный успех с GET 503 не возвращает успешные ID в выбор и не повторяет POST", async () => {
    const transport = installTransport({ full: true, refreshError: 503 });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    transport.recover();
    await user.click(retry);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(writes()).toHaveLength(1);
  });

  it("ошибка самой мутации сохраняет confirm/выбор и не запускает ложный refresh", async () => {
    installTransport({ mutationError: true });
    const user = await openBulk();
    const before = listReads().length;
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getByText(/Выбрано обращений: 2/)).toBeInTheDocument();
    expect(selectedCount(2)).toBeInTheDocument();
    expect(listReads()).toHaveLength(before);
    expect(writes()).toHaveLength(1);
  });

  it("групповой PATCH остаётся single-flight до завершения list refresh", async () => {
    let release!: (value: ReturnType<typeof list>) => void;
    const deferred = new Promise<ReturnType<typeof list>>((resolve) => { release = resolve; });
    installTransport({ edit: true, holdRefresh: deferred });
    const user = await openBulk("edit");
    await user.type(screen.getByRole("textbox", { name: "Служебная заметка" }), "Не дублировать");
    await user.click(screen.getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    try {
      const submit = screen.getByRole("button", { name: /Примен/ });
      expect(submit).toBeDisabled();
      await user.click(submit);
      expect(writes()).toHaveLength(2);
    } finally {
      release(list());
    }
    await waitFor(() => expect(selectedCount(1)).toBeInTheDocument());
  });

  it("ошибка initial GET остаётся fail-closed без старых данных", async () => {
    api.mockRejectedValue(new RemcardApiError(503, "Синтетическая ошибка initial GET"));
    render(<ReceivingAppealsWorkspace />);
    expect(await screen.findByTestId("ca-receiving-appeals-error")).toHaveTextContent("Синтетическая ошибка initial GET");
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it("GET 403 при ручном retry после 503 не оставляет старый write UI", async () => {
    const transport = installTransport({ refreshError: 503 });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    transport.deny(403);
    await user.click(retry);
    expect(await screen.findByTestId("ca-receiving-appeals-error")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it("успешный ручной GET с readOnly не восстанавливает старую кнопку записи", async () => {
    const transport = installTransport({ refreshError: 503, readOnlyAfterRecovery: true });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    transport.recover();
    await user.click(retry);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    const confirm = screen.queryByRole("button", { name: "Подтвердить" });
    if (confirm) {
      expect(confirm).toBeDisabled();
      await user.click(confirm);
    }
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it("ручной GET retry single-flight и не разрешает POST до своего завершения", async () => {
    let release!: (value: ReturnType<typeof list>) => void;
    const deferred = new Promise<ReturnType<typeof list>>((resolve) => { release = resolve; });
    const transport = installTransport({ refreshError: 503, holdRefresh: deferred });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    transport.recover();
    const readsBefore = listReads().length;
    await user.click(retry);
    await waitFor(() => expect(listReads()).toHaveLength(readsBefore + 1));
    try {
      expect(retry).toBeDisabled();
      await user.click(retry);
      expect(listReads()).toHaveLength(readsBefore + 1);
      const confirm = within(screen.getByTestId("ca-receiving-bulk-confirm")).getAllByRole("button")[1];
      expect(confirm).toBeDisabled();
      expect(writes()).toHaveLength(1);
    } finally {
      release(list([ids[1]]));
    }
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
  });

  it("два синхронных клика до React rerender отправляют один POST", async () => {
    installTransport({});
    await openBulk();
    const confirm = screen.getByRole("button", { name: "Подтвердить" });
    act(() => {
      confirm.click();
      confirm.click();
    });
    await waitFor(() => expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument());
    expect(writes()).toHaveLength(1);
    expect(writes()[0][1]?.body).toEqual({ action: "archive", ids });
  });

  it("partial ответ не открывает заново подтверждение, отменённое во время POST", async () => {
    let release!: () => void;
    const deferred = new Promise<void>((resolve) => { release = resolve; });
    installTransport({ holdBatch: deferred });
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(within(screen.getByTestId("ca-receiving-bulk-confirm")).getByRole("button", { name: "Отмена" }));
    expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(selectedCount(1)).toBeInTheDocument());
    expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });
});
