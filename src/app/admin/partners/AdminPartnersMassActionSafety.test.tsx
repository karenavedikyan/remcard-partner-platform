import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { AdminPartnersBulkPanel } from "./AdminPartnersBulkPanel";
import { runBulkApplyQueue } from "./adminPartnersBulkLifecycle";
import { RemcardApiError } from "@/lib/api-client";

const rows = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  displayName: `Partner ${i + 1}`,
  partnerType: "STORE",
  registrationLabel: "DEMO" as const,
  city: "City",
  lifecycle: null,
}));
const facets = {
  matchedTotal: 6,
  partnerKind: { all: 6, agent: 0, specialist: 0, store: 6, company: 0, unknown: 0 },
  registration: { active: 0, demo: 6 },
  catalog: { visible: 6, hidden: 0, notPublic: 0 },
  archive: { archived: 0, notArchived: 6 },
};
const snapshot = {
  action: "hide_catalog" as const,
  reason: "Review",
  revision: 1,
  members: [{ userId: "p1", displayName: "Partner 1", confirmToken: "t1", effects: [], warnings: [] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.fetchPartnerRegistry.mockResolvedValue({ items: rows, total: 6, nextCursor: null, facets });
  api.previewPartnerLifecycle.mockImplementation(async (id: string) => ({
    preview: { displayName: id, effects: ["effect"], warnings: [], confirmToken: `t-${id}` },
  }));
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});

async function open() {
  const view = render(<AdminPartnersClient />);
  await screen.findByText("Partner 1");
  return view;
}

async function expandBulkForm(actionName = "Каталог") {
  fireEvent.click(screen.getByRole("button", { name: actionName }));
  await waitFor(() => screen.getByLabelText("Причина группового изменения"));
}

async function confirm() {
  await expandBulkForm("Каталог");
  fireEvent.change(screen.getByLabelText("Причина группового изменения"), { target: { value: "Review" } });
  fireEvent.change(screen.getByLabelText("Групповое действие"), { target: { value: "hide_catalog" } });
  await waitFor(() => expect(screen.getByLabelText("Групповое действие")).toHaveValue("hide_catalog"));
  fireEvent.click(screen.getByRole("button", { name: "Получить preview группы" }));
  const dialog = await screen.findByRole("dialog", { name: "Скрыть выбранных партнёров?" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog.tagName).toBe("DIALOG");
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
}

describe("Independent mass-action safety", () => {
  it("network loss is unknown, not definite rejection", async () => {
    const result = await runBulkApplyQueue({
      snapshot,
      applyFn: async () => {
        throw new RemcardApiError(0, "Сетевая ошибка");
      },
      shouldStop: () => false,
      onRowStart: () => {},
      onRowDone: () => {},
    });
    expect(result[0].outcome).toBe("unknown");
  });

  it("a pre-stopped queue settles without issuing any request", async () => {
    const apply = vi.fn();
    const result = await Promise.race([
      runBulkApplyQueue({
        snapshot,
        applyFn: apply,
        shouldStop: () => true,
        onRowStart: () => {},
        onRowDone: () => {},
      }),
      new Promise((resolve) => setTimeout(() => resolve("stuck"), 80)),
    ]);
    expect(result).not.toBe("stuck");
    expect(apply).not.toHaveBeenCalled();
  });

  it("keeps stop control visible after the first completed member", () => {
    render(
      <AdminPartnersBulkPanel
        selectedCount={2}
        otherPagesCount={0}
        onClearSelection={() => {}}
        bulkReason="Review"
        onBulkReasonChange={() => {}}
        bulkAction="hide_catalog"
        onBulkActionChange={() => {}}
        onRequestBulkPreview={() => {}}
        bulkPreview={snapshot}
        onConfirmBulk={() => {}}
        onCancelBulkPreview={() => {}}
        previewLoading={false}
        applying
        applyProgress={{ done: 1, total: 2 }}
        applyResults={[{ userId: "p1", displayName: "P1", outcome: "success" }]}
        onStopApply={() => {}}
        onExcludeFailedAndRetryPreview={() => {}}
        previewFailures={null}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Остановить оставшиеся" })).toBeInTheDocument();
  });

  it("locks metric filter chips while applying", async () => {
    api.applyPartnerLifecycle.mockImplementation(() => new Promise(() => {}));
    await open();
    fireEvent.click(screen.getByLabelText("Выбрать Partner 1"));
    await confirm();
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Магазины/ })).toBeDisabled();
  });

  it("allows starting a second group after retaining the first report", async () => {
    await open();
    fireEvent.click(screen.getByLabelText("Выбрать Partner 1"));
    await confirm();
    await screen.findByText("Итог групповой операции");
    await waitFor(() => expect(screen.getByLabelText("Выбрать Partner 1")).not.toBeChecked());
    fireEvent.click(screen.getByLabelText("Выбрать Partner 2"));
    // After a prior report, compact bar returns until an action expands the form.
    await expandBulkForm("Каталог");
    expect(screen.getByLabelText("Причина группового изменения")).toBeInTheDocument();
  });

  it("offers page-wide selection in cards, not just table", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Карточки", exact: true }));
    // Compact cards omit a duplicate page-select checkbox; toolbar keeps the action.
    const selectPage = screen.getByRole("button", { name: "Выбрать страницу" });
    expect(selectPage).toBeInTheDocument();
    fireEvent.click(selectPage);
    expect(screen.getByLabelText("Выбрать Partner 1")).toBeChecked();
    expect(screen.getByLabelText("Выбрать Partner 2")).toBeChecked();
  });

  it("cannot select old rows while a new filtered list is loading", async () => {
    await open();
    const before = api.fetchPartnerRegistry.mock.calls.length;
    api.fetchPartnerRegistry.mockImplementation(() => new Promise(() => {}));
    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "demo" } });
    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("demo"));
    await waitFor(() => expect(api.fetchPartnerRegistry.mock.calls.length).toBeGreaterThan(before));
    const old = screen.queryByLabelText("Выбрать Partner 1");
    if (old) expect(old).toBeDisabled();
  });

  it("keeps failed-preview recovery visible and cannot confirm an incomplete group", async () => {
    api.previewPartnerLifecycle.mockImplementation(async (id: string) => {
      if (id === "p2") throw new RemcardApiError(409, "Denied");
      return {
        preview: { displayName: id, effects: ["effect"], warnings: [], confirmToken: `t-${id}` },
      };
    });
    await open();
    fireEvent.click(screen.getByLabelText("Выбрать Partner 1"));
    fireEvent.click(screen.getByLabelText("Выбрать Partner 2"));
    await expandBulkForm("Каталог");
    fireEvent.change(screen.getByLabelText("Причина группового изменения"), { target: { value: "Review" } });
    fireEvent.change(screen.getByLabelText("Групповое действие"), { target: { value: "hide_catalog" } });
    await waitFor(() => expect(screen.getByLabelText("Групповое действие")).toHaveValue("hide_catalog"));
    fireEvent.click(screen.getByRole("button", { name: "Получить preview группы" }));
    const exclude = await screen.findByRole("button", { name: "Исключить проблемные и обновить preview" });
    expect(screen.queryByRole("button", { name: "Подтвердить" })).not.toBeInTheDocument();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    fireEvent.click(exclude);
    const dialog = await screen.findByRole("dialog", { name: "Скрыть выбранных партнёров?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await screen.findByText("Итог групповой операции");
    expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(1);
    expect(api.applyPartnerLifecycle.mock.calls[0][0]).toBe("p1");
  });

  it("the first request after a filter change does not reuse the previous page cursor", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({ items: rows, total: 60, nextCursor: "p6", facets });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Следующая страница" }));
    await waitFor(() =>
      expect(api.fetchPartnerRegistry.mock.calls.some(([p]) => p.get("cursor") === "p6")).toBe(true),
    );
    const before = api.fetchPartnerRegistry.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "demo" } });
    await waitFor(() => expect(api.fetchPartnerRegistry.mock.calls.length).toBeGreaterThan(before));
    expect(api.fetchPartnerRegistry.mock.calls[before][0].get("cursor")).toBeNull();
  });

  it("unmount stops all not-yet-started mutations", async () => {
    const finishes = new Map<string, () => void>();
    api.applyPartnerLifecycle.mockImplementation(
      (id: string) => new Promise((resolve) => finishes.set(id, () => resolve({ ok: true }))),
    );
    const view = await open();
    fireEvent.click(screen.getByLabelText("Выбрать на странице"));
    await confirm();
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(3));
    view.unmount();
    for (const finish of [...finishes.values()]) finish();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(3);
  });
});
