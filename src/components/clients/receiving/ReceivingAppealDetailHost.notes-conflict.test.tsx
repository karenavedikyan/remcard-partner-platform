import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));
const api = vi.mocked(remcardFetch);
const draft = "Мой несохранённый текст\nСогласовать время звонка";
const initial = "Исходная заметка";
const remote = "Заметка другого сотрудника";
const at = "2026-11-14T20:00:00.000Z";

function install(options: {
  conflicts?: number;
  refreshErrors?: number;
  refreshStatus?: number;
  patchError?: boolean;
  holdRefresh?: Promise<void>;
  holdSecondPatch?: Promise<void>;
} = {}) {
  let conflicts = options.conflicts ?? 1;
  let refreshErrors = options.refreshErrors ?? 0;
  let patchError = options.patchError;
  let holdRefresh = options.holdRefresh;
  const state = { revision: 1, notes: initial, stage: "sys_new", conflicted: false };
  api.mockImplementation(async (path, request) => {
    const id = path.split("/")[4];
    if (!["one", "two"].includes(id)) throw new Error(`Unexpected request: ${path}`);
    if (request?.method === "PATCH") {
      if (id === "two" && options.holdSecondPatch) await options.holdSecondPatch;
      const body = request.body as { privateNotes?: string; stageKey?: string; expectedRevision: number };
      if (path.endsWith("/stage")) {
        state.stage = body.stageKey!;
        state.revision++;
        return {} as never;
      }
      if (patchError) {
        patchError = false;
        throw new RemcardApiError(503, "Ошибка сохранения");
      }
      if (conflicts > 0) {
        conflicts--;
        state.conflicted = true;
        state.revision++;
        state.notes = remote;
        throw new RemcardApiError(409, "Конфликт версии");
      }
      if (body.expectedRevision !== state.revision) throw new Error("Stale PATCH");
      state.notes = body.privateNotes!;
      state.revision++;
      return {} as never;
    }
    if (state.conflicted && id === "one") {
      if (holdRefresh) {
        const held = holdRefresh;
        holdRefresh = undefined;
        await held;
      }
      if (refreshErrors > 0) {
        refreshErrors--;
        throw new RemcardApiError(options.refreshStatus ?? 503, "Ошибка обновления");
      }
    }
    return {
      appeal: {
        id, clientDisplayName: `Клиент ${id}`, receivingPartnerUserId: "owner",
        receivingBranchId: null, receivingOrganizationId: null,
        originKind: "manual", stageKey: state.stage,
        privateNotes: id === "one" ? state.notes : "Заметка второй карточки",
        createdAt: at, updatedAt: at,
      },
      revision: state.revision, history: [],
      workingStages: [{ id: "work_contact", label: "На связи" }],
      refusalReasons: [],
    } as never;
  });
  return state;
}
function patches() {
  return api.mock.calls.filter(([, request]) => request?.method === "PATCH");
}
function reads() {
  return api.mock.calls.filter(([, request]) => !request?.method);
}
async function open(readOnly = false, onAppealMutated?: () => Promise<void>) {
  const user = userEvent.setup();
  const view = render(<ReceivingAppealDetailHost appealId="one" onBack={vi.fn()} readOnly={readOnly} onAppealMutated={onAppealMutated} />);
  if (!readOnly) {
    await screen.findByTestId("ca-receiving-notes-input");
    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(initial));
  }
  return { user, ...view };
}
async function enterAndSave(user: ReturnType<typeof userEvent.setup>, text = draft) {
  await user.clear(screen.getByTestId("ca-receiving-notes-input"));
  if (text) await user.type(screen.getByTestId("ca-receiving-notes-input"), text);
  await user.click(screen.getByTestId("ca-receiving-notes-save"));
}
async function expectReconciled(text = draft) {
  await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-save")).toBeEnabled());
  expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(text);
  expect(screen.getByTestId("ca-receiving-notes-error")).toHaveTextContent("Ваш черновик сохранён");
  expect(screen.getByTestId("ca-receiving-notes-server-value")).toHaveTextContent(remote);
}

beforeEach(() => { api.mockReset(); });

describe("Receiving detail: preserve notes draft across CAS conflict", () => {
  it("409 → GET preserves draft/message, explicit retry alone writes with fresh revision", async () => {
    const state = install();
    const { user } = await open();
    await enterAndSave(user);
    await expectReconciled();
    expect(patches()).toHaveLength(1);
    expect(reads()).toHaveLength(2);
    expect(state.notes).toBe(remote);
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await waitFor(() => expect(state.notes).toBe(draft));
    await waitFor(() => expect(screen.queryByTestId("ca-receiving-notes-error")).not.toBeInTheDocument());
    expect(patches().map(([, r]) => r?.body)).toEqual([
      { privateNotes: draft, expectedRevision: 1 },
      { privateNotes: draft, expectedRevision: 2 },
    ]);
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
  });

  it("intentional clearing is a dirty draft, not a reason to restore server text", async () => {
    const state = install();
    const { user } = await open();
    await enterAndSave(user, "");
    await expectReconciled("");
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await waitFor(() => expect(state.notes).toBe(""));
    expect(patches()).toHaveLength(2);
  });

  it.each([503, 403])("409 → GET %s blocks writes, manual recovery is GET-only", async (refreshStatus) => {
    install({ refreshErrors: 2, refreshStatus });
    const { user } = await open();
    await enterAndSave(user);
    await screen.findByTestId("ca-receiving-notes-retry");
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
    expect(screen.getByTestId("ca-receiving-notes-input")).toBeEnabled();
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeDisabled();
    expect(screen.getByTestId("ca-receiving-next-primary")).toBeDisabled();
    expect(screen.getByTestId("ca-receiving-pick-toggle")).toBeDisabled();
    expect(screen.queryByTestId("ca-receiving-notes-server-value")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("ca-receiving-notes-retry"));
    await waitFor(() => expect(reads()).toHaveLength(3));
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeDisabled();
    expect(patches()).toHaveLength(1);
    await user.click(screen.getByTestId("ca-receiving-notes-retry"));
    await expectReconciled();
    expect(reads()).toHaveLength(4);
    expect(patches()).toHaveLength(1);
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1][1]?.body).toEqual({ privateNotes: draft, expectedRevision: 2 });
  });

  it("slow reconciliation and synchronous double click cannot duplicate the PATCH", async () => {
    let release!: () => void;
    install({ holdRefresh: new Promise<void>((resolve) => { release = resolve; }) });
    const { user } = await open();
    await user.clear(screen.getByTestId("ca-receiving-notes-input"));
    await user.type(screen.getByTestId("ca-receiving-notes-input"), draft);
    const save = screen.getByTestId("ca-receiving-notes-save");
    act(() => { save.click(); save.click(); });
    await waitFor(() => expect(reads()).toHaveLength(2));
    expect(patches()).toHaveLength(1);
    expect(save).toBeDisabled();
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
    await act(async () => release());
    await expectReconciled();
    expect(patches()).toHaveLength(1);
  });

  it("a second conflict also preserves the draft, never retries automatically", async () => {
    install({ conflicts: 2 });
    const { user } = await open();
    await enterAndSave(user);
    await expectReconciled();
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await expectReconciled();
    expect(patches()).toHaveLength(2);
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await waitFor(() => expect(patches()).toHaveLength(3));
    expect(patches().map(([, r]) => (r?.body as { expectedRevision: number }).expectedRevision)).toEqual([1, 2, 3]);
  });

  it("ordinary 503 keeps the draft and retries without a conflict refresh", async () => {
    const state = install({ conflicts: 0, patchError: true });
    const { user } = await open();
    await enterAndSave(user);
    expect(await screen.findByTestId("ca-receiving-notes-error")).toHaveTextContent("Ошибка сохранения");
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
    expect(reads()).toHaveLength(1);
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    await waitFor(() => expect(state.notes).toBe(draft));
    expect(patches()).toHaveLength(2);
  });

  it("refresh after changing stage also preserves an unrelated unsaved note", async () => {
    install({ conflicts: 0 });
    const { user } = await open();
    await user.clear(screen.getByTestId("ca-receiving-notes-input"));
    await user.type(screen.getByTestId("ca-receiving-notes-input"), draft);
    await user.click(screen.getByTestId("ca-receiving-pick-toggle"));
    await user.selectOptions(screen.getByTestId("ca-receiving-stage-select"), "work_contact");
    await user.click(screen.getByRole("button", { name: "Перевести" }));
    await waitFor(() => expect(reads()).toHaveLength(2));
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
    expect(patches()).toHaveLength(1);
  });

  it("switching appeal during a held conflict GET cannot leak the previous draft/response", async () => {
    let release!: () => void;
    install({ holdRefresh: new Promise<void>((resolve) => { release = resolve; }) });
    const { user, rerender } = await open();
    await enterAndSave(user);
    await waitFor(() => expect(reads()).toHaveLength(2));
    rerender(<ReceivingAppealDetailHost appealId="two" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue("Заметка второй карточки"));
    expect(screen.getByTestId("ca-receiving-notes-input")).toBeEnabled();
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeEnabled();
    await act(async () => release());
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue("Заметка второй карточки");
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeEnabled();
    expect(screen.queryByTestId("ca-receiving-notes-error")).not.toBeInTheDocument();
    expect(patches()).toHaveLength(1);
  });

  it("readOnly never exposes notes mutation or conflict retry", async () => {
    install();
    await open(true);
    await screen.findByTestId("ca-receiving-appeal-readonly");
    expect(screen.queryByTestId("ca-receiving-notes-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-notes-save")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-notes-retry")).not.toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });

  it("successful PATCH plus rejected parent refresh never locks the form or repeats the write", async () => {
    const state = install({ conflicts: 0 });
    const onAppealMutated = vi.fn().mockRejectedValue(new Error("Synthetic parent refresh failure"));
    const { user } = await open(false, onAppealMutated);
    await enterAndSave(user);
    await waitFor(() => expect(state.notes).toBe(draft));
    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-save")).toBeEnabled());
    expect(screen.getByTestId("ca-receiving-notes-input")).toBeEnabled();
    expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue(draft);
    expect(screen.getByTestId("ca-receiving-detail-refresh-notice")).toHaveTextContent("список клиентов не удалось обновить");
    expect(reads()).toHaveLength(2);
    expect(patches()).toHaveLength(1);
    expect(onAppealMutated).toHaveBeenCalledTimes(1);
  });

  it("old conflict response cannot release the next appeal's in-flight PATCH", async () => {
    let releaseOld!: () => void;
    let releaseNext!: () => void;
    install({
      holdRefresh: new Promise<void>((resolve) => { releaseOld = resolve; }),
      holdSecondPatch: new Promise<void>((resolve) => { releaseNext = resolve; }),
    });
    const { user, rerender } = await open();
    await enterAndSave(user);
    await waitFor(() => expect(reads()).toHaveLength(2));
    rerender(<ReceivingAppealDetailHost appealId="two" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-input")).toHaveValue("Заметка второй карточки"));
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeDisabled();
    await act(async () => releaseOld());
    expect(screen.getByTestId("ca-receiving-notes-save")).toBeDisabled();
    expect(screen.getByTestId("ca-receiving-notes-input")).toBeDisabled();
    await act(async () => releaseNext());
    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-save")).toBeEnabled());
    expect(patches()).toHaveLength(2);
    expect(patches().map(([path]) => path)).toEqual([
      "/api/pro/client-appeals/one", "/api/pro/client-appeals/two",
    ]);
  });
});

describe("AB-05: explicit confirmation that the note was saved", () => {
  const saveButton = () => screen.getByTestId("ca-receiving-notes-save");

  it("shows «Сохранено ✓» after a successful save and drops it on the next edit", async () => {
    const state = install({ conflicts: 0 });
    const { user } = await open();
    expect(saveButton()).toHaveTextContent("Сохранить");
    expect(saveButton()).not.toHaveAttribute("data-saved");

    await enterAndSave(user, "Новая заметка");
    await waitFor(() => expect(saveButton()).toHaveAttribute("data-saved", "true"));
    expect(state.notes).toBe("Новая заметка");
    expect(saveButton()).toHaveTextContent("Сохранено ✓");
    expect(screen.getByTestId("ca-receiving-notes-saved-status")).toHaveTextContent("Заметка сохранена");
    expect(screen.queryByTestId("ca-receiving-notes-error")).not.toBeInTheDocument();

    await user.type(screen.getByTestId("ca-receiving-notes-input"), "!");
    expect(saveButton()).not.toHaveAttribute("data-saved");
    expect(saveButton()).toHaveTextContent("Сохранить");
    expect(saveButton()).toBeEnabled();
    expect(screen.getByTestId("ca-receiving-notes-saved-status")).toHaveTextContent("");
  });

  it("never shows success on a 409 conflict; the draft is kept and the success appears only after the explicit retry", async () => {
    const state = install();
    const { user } = await open();
    await enterAndSave(user);
    await expectReconciled();
    expect(saveButton()).not.toHaveAttribute("data-saved");
    expect(saveButton()).toHaveTextContent("Сохранить");

    await user.click(saveButton());
    await waitFor(() => expect(state.notes).toBe(draft));
    await waitFor(() => expect(saveButton()).toHaveAttribute("data-saved", "true"));
  });

  it("never shows success on an ordinary server error", async () => {
    install({ conflicts: 0, patchError: true });
    const { user } = await open();
    await enterAndSave(user);
    expect(await screen.findByTestId("ca-receiving-notes-error")).toHaveTextContent("Ошибка сохранения");
    expect(saveButton()).not.toHaveAttribute("data-saved");
    expect(saveButton()).toHaveTextContent("Сохранить");
  });

  it("an intentional empty note is confirmed too", async () => {
    install({ conflicts: 0 });
    const { user } = await open();
    await enterAndSave(user, "");
    await waitFor(() => expect(saveButton()).toHaveAttribute("data-saved", "true"));
  });
});
