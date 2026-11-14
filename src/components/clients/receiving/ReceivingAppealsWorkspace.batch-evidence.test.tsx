import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { postReceivingAppealsBatch } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const ids = ["receiving-one", "receiving-two"];
const at = "2026-11-14T18:40:00.000Z";
const payload = (updatedIds: string[], skippedIds: string[] = [], failures: object[] = []) => ({
  updatedIds, skippedIds, failures,
});
const writes = () => api.mock.calls.filter(([, o]) => o?.method === "POST");
const listReads = () => api.mock.calls.filter(([p]) => p.split("?")[0] === "/api/pro/client-appeals");

function install(response: unknown, status = 200, refreshError = false) {
  const active = new Set(ids);
  let posted = false;
  let count = 0;
  let refreshFailed = refreshError;
  api.mockImplementation(async (path, options) => {
    if (path.endsWith("/working-stages")) {
      return { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] } as never;
    }
    if (path === "/api/pro/client-appeals/batch" && options?.method === "POST") {
      posted = true;
      count += 1;
      if (status >= 400) throw new RemcardApiError(status, "Синтетический отказ", response as never);
      active.delete(count === 1 ? ids[0] : ids[1]);
      return (count === 1 ? response : payload([ids[1]])) as never;
    }
    if (path.split("?")[0] === "/api/pro/client-appeals") {
      if (posted && refreshFailed) throw new RemcardApiError(503, "Синтетическая ошибка обновления");
      const bucket = new URL(path, "https://synthetic.invalid").searchParams.get("bucket") ?? "active";
      return {
        appeals: [...active].map((id) => ({
          id, clientDisplayName: `Синтетический ${id}`, receivingPartnerUserId: "receiver",
          stageKey: "sys_new", originKind: "manual", createdAt: at, updatedAt: at, bucket,
        })),
        readOnly: false, nextCursor: null, tab: bucket,
      } as never;
    }
    throw new Error(`Unexpected synthetic request: ${options?.method ?? "GET"} ${path}`);
  });
  return { recover: () => { refreshFailed = false; } };
}

async function open(action = "archive") {
  const user = userEvent.setup();
  render(<ReceivingAppealsWorkspace />);
  await screen.findByRole("checkbox", { name: "Все найденные (2)" });
  if (action === "unarchive" || action === "restore") {
    await user.click(screen.getByRole("tab", { name: action === "restore" ? "Корзина" : "Архив" }));
    await screen.findByRole("checkbox", { name: "Все найденные (2)" });
  }
  await user.click(screen.getByRole("checkbox", { name: "Все найденные (2)" }));
  const label = {
    archive: "В архив", unarchive: "Вернуть в активные", trash: "Удалить", restore: "Восстановить",
  }[action]!;
  await user.click(screen.getByRole("button", { name: label }));
  await user.click(screen.getByRole("button", { name: "Подтвердить" }));
  return user;
}

beforeEach(() => { api.mockReset(); });

describe("Receiving workspace: request-bound batch evidence", () => {
  it.each(["archive", "unarchive", "trash", "restore"])(
    "%s keeps the omitted record selected when K1 does not echo action",
    async (action) => {
      install(payload([ids[0]]));
      await open(action);
      await waitFor(() => expect(screen.getByText("Выбрано: 1")).toBeInTheDocument());
      expect(screen.getByText(/Выбрано обращений: 1/)).toBeInTheDocument();
      expect(screen.getAllByText("Обновлено: 1, пропущено: 1.")).toHaveLength(2);
      expect(writes()).toHaveLength(1);
      expect(writes()[0][1]?.body).toEqual({ action, ids });
    },
  );

  it.each([
    ["foreign IDs", payload([ids[0], "foreign"], ["alien"], [{ id: "outside" }])],
    ["overlapping IDs", payload(ids, [ids[1]], [{ id: ids[1], code: "CONFLICT" }])],
    ["duplicate IDs", payload([ids[0], ids[0]], [ids[1], ids[1]], [{ id: ids[1] }, { id: ids[1] }])],
  ])("%s never changes the selection or count outside the request", async (_, response) => {
    install(response);
    const user = await open();
    await waitFor(() => expect(screen.getByText("Выбрано: 1")).toBeInTheDocument());
    expect(screen.getAllByText("Обновлено: 1, пропущено: 1.")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument());
    expect(writes()).toHaveLength(2);
    expect(writes()[1][1]?.body).toEqual({ action: "archive", ids: [ids[1]] });
  });

  it.each([
    ["empty", payload([])],
    ["null", null],
    ["malformed negatives", { ...payload(ids), failures: [null] }],
    ["wrong action", { ...payload(ids), action: "restore" }],
    ["only foreign successes", payload(["outside"])],
    ["all contradictory", payload(ids, ids)],
  ])("%s response preserves confirmation and both selected records", async (_, response) => {
    install(response);
    await open();
    const confirmation = screen.getByTestId("ca-receiving-bulk-confirm");
    await waitFor(() => expect(within(confirmation).getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Выбрано: 2")).toBeInTheDocument();
    expect(screen.getByText(/Выбрано обращений: 2/)).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
    expect(listReads()).toHaveLength(1);
  });

  it("only an explicit full response closes confirmation and clears selection", async () => {
    install(payload(ids));
    await open();
    await waitFor(() => expect(screen.queryByTestId("ca-receiving-bulk-confirm")).not.toBeInTheDocument());
    expect(screen.getByText("Выбрано: 0")).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it("recovers 409 partial without action and counts each failed record once", async () => {
    install(payload([ids[0]], [ids[1]], [{ id: ids[1], code: "CONFLICT" }]), 409);
    await open();
    await waitFor(() => expect(screen.getByText("Выбрано: 1")).toBeInTheDocument());
    expect(screen.getAllByText("Обновлено: 1, пропущено: 1.")).toHaveLength(2);
  });

  it("does not erase malformed negative evidence from a partial error body", async () => {
    install({ ...payload(ids), failures: [null] }, 409);
    await open();
    await waitFor(() => expect(within(screen.getByTestId("ca-receiving-bulk-confirm"))
      .getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Выбрано: 2")).toBeInTheDocument();
    expect(listReads()).toHaveLength(1);
  });

  it.each([401, 403])("fails closed for %i even if its body claims successful IDs", async (status) => {
    install(payload(ids), status);
    await open();
    await waitFor(() => expect(within(screen.getByTestId("ca-receiving-bulk-confirm"))
      .getByRole("alert")).toHaveTextContent("Синтетический отказ"));
    expect(screen.getByText("Выбрано: 2")).toBeInTheDocument();
    expect(listReads()).toHaveLength(1);
  });

  it("GET-only recovery after omitted IDs + refresh 503 preserves the pending selection", async () => {
    const transport = install(payload([ids[0]]), 200, true);
    const user = await open();
    await screen.findByRole("button", { name: /Повторить обновление/ });
    expect(screen.getByText("Выбрано: 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled();
    transport.recover();
    await user.click(screen.getByRole("button", { name: /Повторить обновление/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(writes()).toHaveLength(1);
    expect(screen.getByText("Выбрано: 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1][1]?.body).toEqual({ action: "archive", ids: [ids[1]] });
  });

  it("transport deduplicates but does not rewrite opaque request IDs", async () => {
    api.mockResolvedValue(payload([" opaque "]) as never);
    await postReceivingAppealsBatch({ action: "archive", ids: [" opaque ", " opaque ", ""] });
    expect(writes()[0][1]?.body).toEqual({ action: "archive", ids: [" opaque "] });
  });
});
