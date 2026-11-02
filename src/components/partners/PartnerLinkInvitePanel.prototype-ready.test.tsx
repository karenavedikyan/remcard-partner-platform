import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProProfileResponse } from "@/lib/types";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  remcardFetch: api,
  RemcardApiError: class extends Error {},
}));
vi.mock("@/lib/config", () => ({ getAppUrl: () => "http://127.0.0.1:4312" }));

const response = { previewPath: "/invite/owned-only", token: "owned-only", expiresAt: "2026-11-16T12:00:00Z" };
const sender = (categories = ["doors", "flooring", "handles"]) => ({
  user: { id: "owned-sender", displayName: "Проверка", partnerType: "COMPANY",
    partnerActivities: ["SERVICE"], storeCategories: categories, specializations: [] },
  organization: null,
} as unknown as ProProfileResponse);

function review(type = "STORE", message = "Проверенные условия для партнёра") {
  fireEvent.change(screen.getByRole("textbox", { name: /^Имя или название/ }), { target: { value: "Партнёр QA" } });
  fireEvent.change(screen.getByLabelText("Предполагаемый тип партнёра"), { target: { value: type } });
  fireEvent.click(screen.getByRole("button", { name: "Далее: сообщение" }));
  fireEvent.change(screen.getByRole("textbox", { name: /^Текст приглашения/ }), { target: { value: message } });
  fireEvent.click(screen.getByRole("button", { name: "Далее: проверить" }));
}

beforeEach(() => {
  api.mockReset().mockImplementation(async (_path, options) => options?.method === "POST" ? response : { invites: [] });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("terms link uses the prototype ready composition without changing acceptance policy", () => {
  it.each(["AGENT", "MASTER", "STORE", "COMPANY"])("freezes exact %s message/categories, shares and opens a read-only preview", async (type) => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<PartnerLinkInvitePanel meProfile={sender()} wizard />);
    review(type);
    expect(screen.getAllByTestId(/^link-invite-category-/).map(e => e.dataset.testid)).toEqual([
      "link-invite-category-doors", "link-invite-category-flooring", "link-invite-category-handles",
    ]);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать приглашение" }));
    const ready = await screen.findByTestId("partner-link-invite-ready");
    expect(within(ready).getByRole("heading", { name: "Теперь передайте приглашение" })).toHaveFocus();
    expect(within(ready).getByText("Проверенные условия для партнёра")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Ссылка" })).not.toBeInTheDocument();
    const body = api.mock.calls.find(([, options]) => options?.method === "POST")![1].body;
    expect(body.intendedPartnerType).toBe(type);
    expect(body.terms.map((term: { category: string }) => term.category)).toEqual(["doors", "flooring", "handles"]);
    expect(body.terms[0].storePercent).toBe(12);
    fireEvent.click(within(ready).getByText("Посмотреть условия приглашения"));
    expect(screen.getByTestId("partner-link-invite-ready-terms")).toHaveTextContent("Двери: 12%");
    expect(screen.getByTestId("partner-link-invite-ready-terms")).not.toHaveTextContent("Плитка");
    fireEvent.click(within(ready).getByRole("button", { name: "Поделиться приглашением" }));
    const share = screen.getByRole("textbox", { name: "Готовый текст" });
    expect(share).toHaveValue("Проверенные условия для партнёра\n\nhttp://127.0.0.1:4312/invite/owned-only");
    expect(share).toHaveAttribute("readonly");
    fireEvent.click(within(ready).getByRole("button", { name: "Скопировать текст" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith((share as HTMLTextAreaElement).value));
    fireEvent.click(within(ready).getByRole("button", { name: "Скопировать ссылку" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://127.0.0.1:4312/invite/owned-only"));
    fireEvent.click(within(ready).getByText("Что будет после передачи приглашения"));
    expect(ready).toHaveTextContent("Запросить изменение можно будет после принятия");
    fireEvent.click(within(ready).getByRole("button", { name: "Открыть карточку приглашения" }));
    expect(open).toHaveBeenCalledWith("http://127.0.0.1:4312/invite/owned-only", "_blank", "noopener,noreferrer");
    expect(api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    open.mockRestore();
  });

  it("keeps the submitted snapshot when the profile changes during creation and rejects rapid duplicate submits", async () => {
    let resolve!: (value: typeof response) => void;
    api.mockImplementation((_path, options) => options?.method === "POST"
      ? new Promise(r => { resolve = r; }) : Promise.resolve({ invites: [] }));
    const { rerender } = render(<PartnerLinkInvitePanel meProfile={sender()} wizard />);
    review("COMPANY", "Первоначальный текст");
    const create = screen.getByRole("button", { name: "Создать приглашение" });
    act(() => { fireEvent.click(create); fireEvent.click(create); });
    expect(api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    rerender(<PartnerLinkInvitePanel meProfile={sender(["tiles"])} wizard />);
    await act(async () => resolve(response));
    const ready = await screen.findByTestId("partner-link-invite-ready");
    expect(ready).toHaveTextContent("Первоначальный текст");
    fireEvent.click(screen.getByText("Посмотреть условия приглашения"));
    expect(screen.getByTestId("partner-link-invite-ready-terms")).toHaveTextContent("Двери: 10%");
    expect(screen.getByTestId("partner-link-invite-ready-terms")).not.toHaveTextContent("Плитка");
    fireEvent.click(screen.getByRole("button", { name: "Поделиться приглашением" }));
    expect(screen.getByRole("textbox", { name: "Готовый текст" })).toHaveValue("Первоначальный текст\n\nhttp://127.0.0.1:4312/invite/owned-only");
  });

  it("retains the draft after failure and exposes manual copying when clipboard is unavailable", async () => {
    let attempts = 0;
    api.mockImplementation(async (_path, options) => {
      if (options?.method !== "POST") return { invites: [] };
      if (++attempts === 1) throw new Error("Owned transport failure");
      return response;
    });
    render(<PartnerLinkInvitePanel meProfile={sender()} wizard />);
    review();
    fireEvent.click(screen.getByRole("button", { name: "Создать приглашение" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось создать ссылку");
    expect(screen.getByText("Проверенные условия для партнёра")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Создать приглашение" }));
    await screen.findByTestId("partner-link-invite-ready");
    fireEvent.click(screen.getByRole("button", { name: "Поделиться приглашением" }));
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Clipboard denied"));
    fireEvent.click(screen.getByRole("button", { name: "Скопировать текст" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Скопируйте текст приглашения вручную");
    expect((screen.getByRole("textbox", { name: "Готовый текст" }) as HTMLTextAreaElement).value).toContain("/invite/owned-only");
    fireEvent.click(screen.getByRole("button", { name: "Скрыть текст для передачи" }));
    expect(screen.queryByRole("textbox", { name: "Готовый текст" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Поделиться приглашением" }));
    expect(screen.getByTestId("link-invite-created-url")).toHaveValue("http://127.0.0.1:4312/invite/owned-only");
  });
});
