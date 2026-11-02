import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProProfileResponse } from "@/lib/types";
import { AgentPartnersHub } from "./AgentPartnersHub";

const api = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api-client", () => ({ remcardFetch: api, RemcardApiError: class extends Error {} }));
vi.mock("@/lib/config", () => ({ getAppUrl: () => "http://127.0.0.1:4312" }));
vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: async () => ({ products: [], services: [], stages: [] }),
}));
const profile = { user: { id: "owned-specialist", displayName: "Проверка", partnerType: "MASTER",
  partnerActivities: ["SERVICE"], specializations: ["L1-9"], storeCategories: [],
  badges: [], areas: [], city: "Сочи" }, organization: null, programs: [] } as unknown as ProProfileResponse;
const response = { id: "owned-discussion", token: "owned", previewPath: "/discussion-invite/owned", expiresAt: "2026-11-16T00:00:00Z" };
beforeEach(() => {
  api.mockReset().mockImplementation(async (_path, options) => options?.method === "POST"
    ? response : { user: profile.user, organization: null, programs: [], partnerships: [], invites: [], partners: [] });
});
async function openLink() {
  fireEvent.click(screen.getByRole("button", { name: "Найти партнёра", exact: true }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Ещё не в RemCard/ }));
  await screen.findByTestId("agent-discussion-invite-wizard");
}
function renderHub() {
  render(<AgentPartnersHub meId="owned-specialist" initialProfile={profile} presentationAudience="specialist-r04" />);
}
function typeName(name = "Черновик специалиста") {
  fireEvent.change(screen.getByRole("textbox", { name: /^Имя или название/ }), { target: { value: name } });
}
describe("specialist default discussion uses the shared prototype wizard", () => {
  it("protects drafts in both mode-switch directions and preserves Stay including Escape", async () => {
    renderHub(); await openLink();
    expect(screen.getByRole("tab", { name: "К обсуждению" })).toHaveAttribute("aria-selected", "true");
    typeName();
    fireEvent.click(screen.getByRole("button", { name: "Далее: сообщение" }));
    fireEvent.click(screen.getByRole("tab", { name: "С условиями" }));
    let confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("Сменить тип приглашения?");
    fireEvent.click(within(confirm).getByRole("button", { name: "Остаться" }));
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "2");
    fireEvent.click(screen.getByRole("tab", { name: "С условиями" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "К обсуждению" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "С условиями" }));
    confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Сменить тип" }));
    expect(await screen.findByTestId("partner-link-invite-wizard")).toHaveTextContent("Кого хотите пригласить?");
    typeName("Условия специалиста");
    fireEvent.click(screen.getByRole("tab", { name: "К обсуждению" }));
    confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Остаться" }));
    expect(screen.getByRole("textbox", { name: /^Имя или название/ })).toHaveValue("Условия специалиста");
    expect(api.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(0);
  });

  it("closes through the dirty guard, resets the draft, and creates a discussion without financial terms", async () => {
    renderHub(); await openLink(); typeName();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть", exact: true }));
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: /Выйти|Не сохранять|Закрыть без|Сбросить/ }));
    await openLink();
    expect(screen.getByRole("textbox", { name: /^Имя или название/ })).toHaveValue("");
    typeName("Новый партнёр");
    fireEvent.click(screen.getByRole("button", { name: "Далее: сообщение" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Текст приглашения/ }), { target: { value: "Обсудим сотрудничество" } });
    fireEvent.click(screen.getByRole("button", { name: "Далее: проверить" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать ссылку", exact: true }));
    await screen.findByTestId("agent-discussion-invite-ready");
    expect(screen.getByRole("heading", { name: "Приглашение создано", exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Тип ссылки" })).not.toBeInTheDocument();
    const posts = api.mock.calls.filter(([, o]) => o?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("/api/partnership/discussion-invite");
    expect(posts[0][1].body).toEqual({ recipientLabel: "Новый партнёр", cooperationSubject: "Обсудим сотрудничество" });
  });

  it("disables mode switching while creation is in flight", async () => {
    let resolve!: (v: typeof response) => void;
    api.mockImplementation(async (_path, options) => options?.method === "POST"
      ? new Promise(r => { resolve = r; }) : { user: profile.user, partnerships: [], invites: [] });
    renderHub(); await openLink(); typeName();
    fireEvent.click(screen.getByRole("button", { name: "Далее: сообщение" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Текст приглашения/ }), { target: { value: "Обсудим сотрудничество" } });
    fireEvent.click(screen.getByRole("button", { name: "Далее: проверить" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать ссылку", exact: true }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "С условиями" })).toBeDisabled());
    expect(screen.getByRole("tab", { name: "К обсуждению" })).toBeDisabled();
    await act(async () => resolve(response));
    await screen.findByTestId("agent-discussion-invite-ready");
  });

  it("ignores the old creation success after confirmed close and reopening a fresh draft", async () => {
    let resolve!: (v: typeof response) => void;
    api.mockImplementation(async (_path, options) => options?.method === "POST"
      ? new Promise(r => { resolve = r; }) : { user: profile.user, partnerships: [], invites: [] });
    renderHub(); await openLink(); typeName();
    fireEvent.click(screen.getByRole("button", { name: "Далее: сообщение" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Текст приглашения/ }), { target: { value: "Поздний ответ" } });
    fireEvent.click(screen.getByRole("button", { name: "Далее: проверить" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать ссылку", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Закрыть", exact: true }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Закрыть без сохранения" }));
    await openLink();
    await act(async () => resolve(response));
    expect(screen.queryByRole("heading", { name: "Приглашение создано", exact: true })).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "1");
    expect(screen.getByRole("textbox", { name: /^Имя или название/ })).toHaveValue("");
  });
});
