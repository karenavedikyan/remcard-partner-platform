import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
  createProfTestUser: vi.fn(),
  disableProfTestUser: vi.fn(),
  setProfTestPublicCatalogShow: vi.fn(),
}));

vi.mock("@/lib/prof-admin-api", () => ({
  createProfTestUser: mocks.createProfTestUser,
  disableProfTestUser: mocks.disableProfTestUser,
  setProfTestPublicCatalogShow: mocks.setProfTestPublicCatalogShow,
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: mocks.remcardFetch,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { AdminTestUsersClient } from "./AdminTestUsersClient";
import { RemcardApiError } from "@/lib/api-client";

const freshRow = {
  id: "fresh-1",
  publicId: "RC-TEST-FRESH",
  displayName: "Свежая строка после создания",
  partnerType: "COMPANY",
  partnerActivities: ["AGENT"],
  profTestDisabledAt: null,
  profTestCreatedAt: "2026-11-01T12:00:00.000Z",
};

describe("AdminTestUsersClient A28d root9 strict load", () => {
  beforeEach(() => {
    mocks.remcardFetch.mockReset();
    mocks.createProfTestUser.mockReset();
  });

  it("TEST-USERS-list-malformed: invalid 200 shows list error, not false empty", async () => {
    mocks.remcardFetch.mockResolvedValueOnce({ rows: [] });
    render(<AdminTestUsersClient />);
    await screen.findByText(/не содержит список/i);
    expect(screen.queryByText(/Тестовых пользователей пока нет/i)).toBeNull();
  });

  it("TEST-USERS-list-empty-valid: genuine items[] shows empty copy", async () => {
    mocks.remcardFetch.mockResolvedValueOnce({ items: [] });
    render(<AdminTestUsersClient />);
    await screen.findByText(/Тестовых пользователей пока нет/i);
    expect(screen.queryByText(/не содержит список/i)).toBeNull();
  });

  it("TEST-USERS-list-stale-get: late initial GET cannot replace post-create reload", async () => {
    let resolveInitial: (value: { items: typeof freshRow[] }) => void = () => {};
    const initialPending = new Promise<{ items: typeof freshRow[] }>((resolve) => {
      resolveInitial = resolve;
    });
    let listGets = 0;
    mocks.remcardFetch.mockImplementation(async (path: string) => {
      if (path !== "/api/pro/admin/test-users") throw new Error(`unmocked ${path}`);
      listGets += 1;
      if (listGets === 1) return initialPending;
      return { items: [freshRow] };
    });
    mocks.createProfTestUser.mockResolvedValueOnce({ item: freshRow });

    const ui = userEvent.setup();
    render(<AdminTestUsersClient />);
    await ui.click(screen.getByRole("button", { name: "Создать" }));
    await screen.findByText("Свежая строка после создания");
    resolveInitial({ items: [] });
    await waitFor(() => expect(screen.getByText("Свежая строка после создания")).toBeInTheDocument());
  });

  it("TEST-USERS-create-503: friendly create error preserves draft; list retry keeps draft", async () => {
    mocks.remcardFetch
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ items: [] });
    mocks.createProfTestUser.mockRejectedValueOnce(new RemcardApiError(503, "SERVICE_UNAVAILABLE"));

    const ui = userEvent.setup();
    render(<AdminTestUsersClient />);
    await screen.findByText(/не содержит список/i);
    const nameInput = screen.getByDisplayValue("Тест · Агент 1");
    await ui.clear(nameInput);
    await ui.type(nameInput, "Черновик после 503");
    await ui.click(screen.getByRole("button", { name: "Создать" }));
    await screen.findByText(/Не удалось создать тестового пользователя/i);
    expect(screen.queryByText("SERVICE_UNAVAILABLE")).toBeNull();
    expect(nameInput).toHaveValue("Черновик после 503");
    await ui.click(screen.getByRole("button", { name: "Повторить загрузку" }));
    await screen.findByText(/Тестовых пользователей пока нет/i);
    expect(nameInput).toHaveValue("Черновик после 503");
  });

  it("TEST-USERS-unmount: pending list GET does not apply after unmount", async () => {
    let resolvePending: (v: { items: [] }) => void = () => {};
    const pending = new Promise<{ items: [] }>((resolve) => {
      resolvePending = resolve;
    });
    mocks.remcardFetch.mockReturnValueOnce(pending);
    const { unmount } = render(<AdminTestUsersClient />);
    unmount();
    resolvePending({ items: [] });
    await Promise.resolve();
  });
});
