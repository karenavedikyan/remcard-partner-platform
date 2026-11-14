import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ObserverPartnersWorkspace } from "./ObserverPartnersWorkspace";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const ids = ["appeal-one", "appeal-two", "appeal-three"];
const updatedAt = "2026-11-14T16:00:00.000Z";

function meta(id: string, version = 1, tag = "Исходная") {
  return {
    appealId: id, alias: `Личное ${id}`, tag, note: `Заметка ${id}`,
    bucket: "active", version, updatedAt,
  };
}

function list(
  versions: Record<string, number> = {},
  tags: Record<string, string> = {},
  buckets: Record<string, string> = {},
) {
  return {
    appeals: ids.map((id, index) => ({
      id, clientDisplayName: `Клиент ${index + 1}`, certificateId: `cert-${index}`,
      receivingPartnerUserId: "receiving-user", receivingBranchId: null,
      referrerProUserId: "referring-user", stageKey: "sys_new",
      createdAt: updatedAt, updatedAt, interest: "Ремонт",
    })),
    receivingPartners: [{
      receivingPartnerUserId: "receiving-user", displayName: "Синтетический партнёр",
      city: "Краснодар", category: "Ремонт", receivingBranchId: null,
    }],
    personalMeta: Object.fromEntries(ids.map((id) => [id, {
      ...meta(id, versions[id] ?? 1, tags[id]), bucket: buckets[id] ?? "active",
    }])),
    total: 3, hasMore: false, page: 1, limit: 100,
  };
}

function batch(processed: string[], skipped: string[], tag = "Новая метка") {
  return {
    action: "setTag", mode: "best_effort",
    processedCount: processed.length, skippedCount: skipped.length,
    processed: processed.map((id) => meta(id, 2, tag)),
    skipped: skipped.map((appealId) => ({ appealId, reason: "version_conflict" })),
  };
}

async function openBulk() {
  const user = userEvent.setup();
  render(<ObserverPartnersWorkspace />);
  await user.click(await screen.findByRole("checkbox", { name: "Все найденные (3)" }));
  await user.click(screen.getByRole("button", { name: "Редактировать" }));
  await user.clear(screen.getByRole("textbox", { name: "Общая метка" }));
  await user.type(screen.getByRole("textbox", { name: "Общая метка" }), "Новая метка");
  return user;
}

function mutationCalls() {
  return api.mock.calls.filter(([, options]) => options?.method !== "GET");
}

beforeEach(() => { api.mockReset(); });

describe("Observer workspace: независимая приёмка partial/retry", () => {
  it("после partial обновляет GET и повторяет только failed ID с новыми версиями", async () => {
    api.mockResolvedValueOnce(list())
      .mockResolvedValueOnce(batch([ids[0]], ids.slice(1)))
      .mockResolvedValueOnce(list({ [ids[0]]: 2, [ids[1]]: 4, [ids[2]]: 5 }, { [ids[0]]: "Новая метка" }))
      .mockResolvedValueOnce(batch(ids.slice(1), []))
      .mockResolvedValueOnce(list({}, Object.fromEntries(ids.map((id) => [id, "Новая метка"]))));
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Применить к 3 записям" }));
    const retry = await screen.findByRole("button", { name: "Повторить для 2 записей" });
    expect(screen.getByRole("textbox", { name: "Общая метка" })).toHaveValue("Новая метка");
    expect(screen.getByText("Выбрано: 2")).toBeInTheDocument();
    await user.click(retry);
    await waitFor(() => expect(mutationCalls()).toHaveLength(2));
    expect(mutationCalls()[1][1]?.body).toMatchObject({
      action: "setTag", ids: ids.slice(1), tag: "Новая метка",
      expectedVersions: { [ids[1]]: 4, [ids[2]]: 5 },
    });
    expect(mutationCalls()[1][1]?.body).not.toHaveProperty("alias");
    expect(mutationCalls()[1][1]?.body).not.toHaveProperty("note");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Общая метка" })).not.toBeInTheDocument());
    expect(screen.getByText("Выбрано: 0")).toBeInTheDocument();
  });

  it("409 не теряет одиночный черновик; повтор берёт обновлённую expectedVersion", async () => {
    api.mockResolvedValueOnce(list())
      .mockRejectedValueOnce(new RemcardApiError(409, "Версия на сервере новее", { code: "VERSION_CONFLICT" }))
      .mockResolvedValueOnce(list({ [ids[0]]: 7 }))
      .mockResolvedValueOnce({ meta: meta(ids[0], 8, "Сохранить черновик") })
      .mockResolvedValueOnce(list({ [ids[0]]: 8 }, { [ids[0]]: "Сохранить черновик" }));
    const user = userEvent.setup();
    render(<ObserverPartnersWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Списком" }));
    const firstRow = screen.getAllByTestId("ca-observer-client-row")[0];
    await user.click(within(firstRow).getByRole("button", { name: "Изменить" }));
    const note = screen.getByRole("textbox", { name: "Личная заметка" });
    await user.clear(note);
    await user.type(note, "Не потерять при конфликте");
    await user.click(screen.getByRole("button", { name: "Сохранить для себя" }));
    const retry = await screen.findByRole("button", { name: "Повторить сохранение" });
    expect(note).toHaveValue("Не потерять при конфликте");
    await user.click(retry);
    await waitFor(() => expect(mutationCalls()).toHaveLength(2));
    expect(mutationCalls()[1][1]?.body).toMatchObject({
      expectedVersion: 7, note: "Не потерять при конфликте",
    });
  });

  it("после ошибки GET сохраняет partial-выбор и черновик, затем восстанавливается", async () => {
    api.mockResolvedValueOnce(list())
      .mockResolvedValueOnce(batch([ids[0]], ids.slice(1)))
      .mockRejectedValueOnce(new RemcardApiError(503, "Временный сбой обновления"))
      .mockResolvedValueOnce(list({ [ids[1]]: 9, [ids[2]]: 9 }, { [ids[0]]: "Новая метка" }));
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Применить к 3 записям" }));
    const refresh = await screen.findByRole("button", { name: "Повторить обновление" });
    expect(screen.getByRole("textbox", { name: "Общая метка" })).toHaveValue("Новая метка");
    expect(screen.getByText("Выбрано: 2")).toBeInTheDocument();
    await user.click(refresh);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Повторить обновление" })).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Общая метка" })).toHaveValue("Новая метка");
    expect(mutationCalls()).toHaveLength(1);
  });

  it("частичный архив повторяет только одну отклонённую запись через personal PATCH", async () => {
    const archived = Object.fromEntries(ids.map((id) => [id, "archived"]));
    const partial = batch(ids.slice(0, 2), [ids[2]]);
    partial.processed = partial.processed.map((row) => ({ ...row, bucket: "archived" }));
    api.mockResolvedValueOnce(list())
      .mockResolvedValueOnce(partial)
      .mockResolvedValueOnce(list({ [ids[2]]: 7 }, {}, { [ids[0]]: "archived", [ids[1]]: "archived" }))
      .mockResolvedValueOnce({ meta: { ...meta(ids[2], 8), bucket: "archived" } })
      .mockResolvedValueOnce(list({ [ids[2]]: 8 }, {}, archived));
    const user = userEvent.setup();
    render(<ObserverPartnersWorkspace />);
    await user.click(await screen.findByRole("checkbox", { name: "Все найденные (3)" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    const confirmation = screen.getByRole("region", { name: "Подтверждение действия" });
    await user.click(within(confirmation).getByRole("button", { name: "В архив" }));
    const retry = await screen.findByRole("button", { name: "Повторить: В архив" });
    expect(screen.getByText("Выбрано: 1")).toBeInTheDocument();
    await user.click(retry);
    await waitFor(() => expect(mutationCalls()).toHaveLength(2));
    expect(mutationCalls()[1][0]).toBe(`/api/pro/referred-appeals/${ids[2]}/personal-meta`);
    expect(mutationCalls()[1][1]).toMatchObject({
      method: "PATCH", body: { action: "move", target: "archived", expectedVersion: 7 },
    });
    await screen.findByRole("heading", { name: "В активном списке нет записей" });
    await user.click(screen.getByRole("button", { name: "Архив 3" }));
    expect(screen.getByRole("checkbox", { name: "Все найденные (3)" })).toBeInTheDocument();
  });

  it("двойной клик при pending не отправляет повторную запись", async () => {
    let resolveSave!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveSave = resolve; });
    api.mockResolvedValueOnce(list()).mockReturnValueOnce(pending).mockResolvedValueOnce(list());
    const user = await openBulk();
    await user.dblClick(screen.getByRole("button", { name: "Применить к 3 записям" }));
    expect(mutationCalls()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Сохранение…" })).toBeDisabled();
    resolveSave(batch(ids, []));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Общая метка" })).not.toBeInTheDocument());
  });

  it("сетевой отказ сохраняет метку и выбор для ручного повтора", async () => {
    api.mockResolvedValueOnce(list()).mockRejectedValueOnce(new RemcardApiError(0, "Сетевая ошибка"));
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Применить к 3 записям" }));
    expect(await screen.findByRole("button", { name: "Повторить для 3 записей" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Общая метка" })).toHaveValue("Новая метка");
    expect(screen.getByText("Выбрано: 3")).toBeInTheDocument();
  });

  it("не считает успешным ID, отсутствующий в неполном batch-ответе", async () => {
    api.mockResolvedValueOnce(list())
      .mockResolvedValueOnce(batch([ids[0], ids[1]], []))
      .mockResolvedValueOnce(list({}, { [ids[0]]: "Новая метка", [ids[1]]: "Новая метка" }));
    const user = await openBulk();
    await user.click(screen.getByRole("button", { name: "Применить к 3 записям" }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("textbox", { name: "Общая метка" })).toHaveValue("Новая метка");
    expect(screen.getByText("Выбрано: 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить для 1 записей" })).toBeEnabled();
  });
});
