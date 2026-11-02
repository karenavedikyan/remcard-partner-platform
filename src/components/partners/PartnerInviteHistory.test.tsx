import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerInviteHistory, type InviteHistoryRow } from "./PartnerInviteHistory";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ remcardFetch: api }));
vi.mock("@/lib/config", () => ({ getAppUrl: () => "https://owned.example" }));
const changed = vi.fn().mockResolvedValue(undefined);
const pending: InviteHistoryRow = { id: "owned-pending", status: "PENDING", title: "Агент",
  author: true, canRecover: true, createdAt: "2026-11-01T10:00:00Z", expiresAt: "2026-12-01T10:00:00Z" };
const accepted: InviteHistoryRow = { ...pending, id: "owned-accepted", status: "ACCEPTED",
  title: "Магазин", acceptedName: "Автовик", acceptedAt: "2026-11-02T10:00:00Z" };
beforeEach(() => {
  api.mockReset(); changed.mockClear();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
describe.each(["terms", "discussion"] as const)("%s invitation history", kind => {
  it("shows the actual partner and localized state, with pending-only recovery", () => {
    render(<PartnerInviteHistory kind={kind} rows={[pending, accepted]} onChanged={changed} />);
    expect(screen.getByText("Автовик")).toBeInTheDocument();
    expect(screen.getByText("Принято")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Показать ссылку" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Отозвать" })).toHaveLength(1);
    expect(api).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation, archives several rows without DELETE, and preserves them on failure", async () => {
    api.mockRejectedValueOnce(new Error("Ошибка сохранения"));
    render(<PartnerInviteHistory kind={kind} rows={[pending, accepted]} onChanged={changed} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Выбрать все" }));
    fireEvent.click(screen.getByRole("button", { name: "Удалить из списка" }));
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Удалить выбранные (2)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ошибка сохранения");
    expect(screen.getByText("Автовик")).toBeInTheDocument();
    api.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Удалить выбранные (2)" }));
    await screen.findByText("В списке пока нет ссылок.");
    expect(api.mock.lastCall?.[1]).toEqual({ method: "PATCH", body: { action: "archive", ids: ["owned-pending", "owned-accepted"] } });
    expect(changed).toHaveBeenCalledOnce();
  });
  it("retrieves and copies the original URL explicitly after mount", async () => {
    const path = kind === "terms" ? "/invite/owned-token" : "/invite/discussion/owned-token";
    api.mockResolvedValue({ ok: true, previewPath: path });
    render(<PartnerInviteHistory kind={kind} rows={[pending]} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "Показать ссылку" }));
    expect(await screen.findByRole("textbox")).toHaveValue(`https://owned.example${path}`);
    expect(api.mock.lastCall?.[1]).toEqual({ method: "GET" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать ссылку" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`https://owned.example${path}`));
  });
  it("does not silently rotate a legacy link and requires a separate explicit repeat", async () => {
    api.mockResolvedValue({ ok: true, previewPath: "/invite/new-owned-token" });
    render(<PartnerInviteHistory kind={kind} rows={[{ ...pending, canRecover: false }]} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "Создать повторную ссылку" }));
    expect(screen.getByText(/Ранее отправленная ссылка останется действующей/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Создать повторную" }));
    expect(await screen.findByRole("textbox")).toHaveValue("https://owned.example/invite/new-owned-token");
    expect(api.mock.lastCall?.[1]).toEqual({ method: "POST" });
  });
  it("does not allow a participant to archive or recover the sender's URL", () => {
    render(<PartnerInviteHistory kind={kind} rows={[{ ...accepted, author: false }]} onChanged={changed} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Показать ссылку" })).not.toBeInTheDocument();
  });
});
