import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerInviteDialog } from "./PartnerInviteDialog";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ remcardFetch: api, RemcardApiError: class extends Error {} }));
const target = {
  id: "owned-target", displayName: "Студия света", partnerType: "STORE",
  city: "Краснодар", storeCategories: ["tiles"], specializations: [], organizationName: null,
} as unknown as PartnerSearchResult;
const profile = (kind = "AGENT") => ({
  user: { id: "owned-sender", partnerType: kind === "AGENT" ? "COMPANY" : kind,
    partnerActivities: kind === "AGENT" ? ["AGENT"] : [kind === "STORE" ? "STORE" : "SERVICE"],
    storeCategories: ["doors", "flooring", "handles"], specializations: ["L1-9"] },
  organization: null, programs: [],
}) as unknown as ProProfileResponse;
const snapshot = { status: "loaded" as const, items: [
  { category: "doors", categoryLabel: "Двери", poolPercent: 12 },
] };
beforeEach(() => { api.mockReset().mockResolvedValue({ ok: true }); });
function mount(kind = "AGENT", extras: Record<string, unknown> = {}) {
  const onClose = vi.fn(), onSent = vi.fn();
  const props = { target, meProfile: profile(kind), busy: false, onClose, onSent,
    showSentState: true, showPublishedTerms: true, publishedTermsSnapshot: snapshot, ...extras };
  return { ...render(<PartnerInviteDialog {...props} />), props, onClose, onSent };
}
async function note(text = "Хочу рекомендовать свет клиентам") {
  await userEvent.type(screen.getByRole("textbox"), text);
}
describe("found partner cooperation dialog", () => {
  it("keeps the selected profile and public terms, owns focus and cancels without POST", async () => {
    const { onClose } = mount();
    const dialog = screen.getByTestId("partner-direct-invite-dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(within(dialog).getByRole("heading"));
    expect(screen.getByTestId("partner-direct-invite-target")).toHaveTextContent("Магазин · Краснодар");
    await userEvent.click(screen.getByText("Общие условия для агентов"));
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-percent")).toHaveTextContent("12%");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(api).not.toHaveBeenCalled();
  });
  it("requires an agent subject before sending", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Укажите предмет");
    expect(api).not.toHaveBeenCalled();
  });
  it("sends once, snapshots successful data, and leaves the confirmed result open", async () => {
    let resolve!: (data: unknown) => void;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    const view = mount();
    await note();
    const button = screen.getByRole("button", { name: "Отправить запрос" });
    fireEvent.click(button); fireEvent.click(button);
    expect(api).toHaveBeenCalledOnce();
    expect(api.mock.calls[0][1].body).toEqual({ targetUserId: "owned-target",
      note: "Хочу рекомендовать свет клиентам", cooperationRequest: true, terms: [] });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(view.onClose).not.toHaveBeenCalled();
    view.rerender(<PartnerInviteDialog {...view.props} target={{ ...target, displayName: "Новое имя" }} />);
    await act(async () => resolve({ ok: true }));
    const ready = screen.getByTestId("partner-direct-invite-ready");
    expect(ready).toHaveTextContent("Студия света");
    expect(ready).not.toHaveTextContent("Новое имя");
    expect(screen.getByRole("heading", { name: "Приглашение отправлено" })).toHaveFocus();
    expect(view.onSent).toHaveBeenCalledOnce();
    expect(view.onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("Карточка приглашения"));
    expect(ready).toHaveTextContent("Хочу рекомендовать свет клиентам");
    expect(ready.querySelectorAll("textarea,input")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Назад к поиску" }));
    expect(view.onClose).toHaveBeenCalledOnce();
  });
  it("preserves a failed draft for explicit retry", async () => {
    api.mockRejectedValueOnce(new Error("Сеть недоступна")).mockResolvedValueOnce({ ok: true });
    mount(); await note("Проверка повтора");
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось отправить");
    expect(screen.getByRole("textbox")).toHaveValue("Проверка повтора");
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    expect(await screen.findByTestId("partner-direct-invite-ready")).toHaveTextContent("Ожидает ответа");
    expect(api).toHaveBeenCalledTimes(2);
  });
  it("ignores a successful response after the old dialog was detached", async () => {
    let resolve!: (data: unknown) => void;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    const view = mount(); await note();
    fireEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    view.unmount(); const fresh = mount();
    await act(async () => resolve({ ok: true }));
    expect(view.onSent).not.toHaveBeenCalled();
    expect(view.onClose).not.toHaveBeenCalled();
    expect(fresh.onSent).not.toHaveBeenCalled();
    expect(screen.queryByTestId("partner-direct-invite-ready")).not.toBeInTheDocument();
  });
  it.each(["MASTER", "STORE", "COMPANY"])("preserves the existing %s financial API contract", async kind => {
    mount(kind);
    const expected = kind === "STORE" ? ["doors", "flooring", "handles"] : ["tiles"];
    expect(screen.getAllByRole("spinbutton")).toHaveLength(expected.length);
    await userEvent.click(screen.getByRole("button", { name: /Отправить приглашение|Отправить запрос/ }));
    await screen.findByTestId("partner-direct-invite-ready");
    const body = api.mock.calls[0][1].body;
    expect(body.cooperationRequest).toBeUndefined();
    expect(body.terms.map((t: {category: string}) => t.category)).toEqual(expected);
    await userEvent.click(screen.getByText("Карточка приглашения"));
    expect(screen.getByTestId("partner-direct-invite-ready")).toHaveTextContent("10%");
  });
  it("retains legacy non-directory completion", async () => {
    const view = mount("STORE", { showSentState: false });
    await userEvent.click(screen.getByRole("button", { name: "Отправить приглашение" }));
    expect(view.onSent).toHaveBeenCalledOnce(); expect(view.onClose).toHaveBeenCalledOnce();
  });
});
