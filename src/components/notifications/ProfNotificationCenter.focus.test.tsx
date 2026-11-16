import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfNotificationCenter } from "./ProfNotificationCenter";

const h = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;
    constructor(status: number, message = "x") {
      super(message);
      this.status = status;
    }
  }
  return { fetch: vi.fn(), MockApiError };
});
const MockApiError = h.MockApiError;
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: h.MockApiError,
  remcardFetch: h.fetch,
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const FULL = "Сотрудник Иван запрашивает пул «Плитка»: 30%.\nТекущий пул: 25%.\nЗапрос действителен до 09.11.2026.";
const focused = {
  id: "n-focus",
  type: "SYSTEM",
  title: "Запрос на лимит",
  body: FULL,
  url: "https://prof.remcard.ru/notifications?focus=n-focus",
  meta: { scope: "PROF" },
  isRead: false,
  readAt: null,
  createdAt: "2026-11-02T10:00:00.000Z",
  action: { requiresAction: false, actionLabel: null },
};
const other = { ...focused, id: "n-other", title: "Другое", body: "Другой текст", url: null, isRead: true };

function route(handlers: { focus: () => unknown }) {
  h.fetch.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url === "/api/pro/notifications/n-focus" && !init?.method) return handlers.focus();
    if (url === "/api/pro/notifications/n-focus" && init?.method === "PATCH") return { ok: true };
    if (url.startsWith("/api/pro/notifications/unread-count")) return { count: 0 };
    if (url.startsWith("/api/pro/notifications")) return { snapshotAt: "2026-11-02T11:00:00Z", nextCursor: null, items: [focused, other] };
    throw new Error(`unexpected ${url}`);
  });
}

beforeEach(() => {
  h.fetch.mockReset();
});

describe("exact notification focus", () => {
  it("shows the complete original request, marks it read, and does not duplicate it in the list", async () => {
    route({ focus: () => ({ item: focused }) });
    render(<ProfNotificationCenter focusId="n-focus" />);
    const body = await screen.findByTestId("notification-focus-body");
    expect(body.textContent).toBe(FULL);
    await waitFor(() =>
      expect(h.fetch).toHaveBeenCalledWith("/api/pro/notifications/n-focus", { method: "PATCH" }),
    );
    expect(screen.getAllByText("Запрос на лимит")).toHaveLength(1);
    expect(screen.getByText("Другое")).toBeInTheDocument();
    const focusSection = screen.getByTestId("notification-focus");
    expect(focusSection.querySelector("button")).toBeNull();
    expect(focusSection.querySelector("a")).toBeNull();
  });

  it("a foreign/unknown/deleted id shows only a neutral message and no notification text", async () => {
    route({
      focus: () => {
        throw new MockApiError(404);
      },
    });
    render(<ProfNotificationCenter focusId="n-focus" />);
    expect(await screen.findByTestId("notification-focus-missing")).toHaveTextContent(/недоступно/);
    expect(screen.queryByTestId("notification-focus-body")).toBeNull();
    expect(h.fetch).not.toHaveBeenCalledWith("/api/pro/notifications/n-focus", { method: "PATCH" });
  });

  it("without a focus id nothing extra is requested or rendered", async () => {
    route({ focus: () => ({ item: focused }) });
    render(<ProfNotificationCenter />);
    await screen.findByText("Другое");
    expect(screen.queryByTestId("notification-focus")).toBeNull();
    expect(h.fetch).not.toHaveBeenCalledWith("/api/pro/notifications/n-focus");
  });
});
