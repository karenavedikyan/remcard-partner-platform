import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  fetchAdminNotifications: vi.fn(),
  markAdminNotificationRead: vi.fn(),
  markAllAdminNotificationsRead: vi.fn(),
  fetchAdminNotificationSettings: vi.fn(),
  patchAdminNotificationSettings: vi.fn(),
  startAdminNotificationBind: vi.fn(),
  fetchAdminNotificationBindStatus: vi.fn(),
}));
vi.mock("@/lib/prof-admin-notifications-api", () => api);

import { AdminNotificationsClient } from "./AdminNotificationsClient";

const item = {
  id: "n1",
  type: "NEW_PARTNER",
  title: "Новый партнёр",
  body: "Зарегистрирован live",
  createdAt: "2026-10-28T09:00:00.000Z",
  readAt: null,
  actionUrl: "https://prof.remcard.ru/admin/moderation/partners/p-new",
  meta: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAdminNotifications.mockResolvedValue({ items: [item], nextCursor: null });
  api.fetchAdminNotificationSettings.mockResolvedValue({
    settings: {
      newClients: true,
      newPartners: true,
      partnerActivity: true,
      channels: [],
      activityFrequency: "daily",
    },
    bindings: { telegramLinked: false, maxLinked: false },
  });
});

describe("AdminNotificationsClient", () => {
  it("loads inbox with unread filter param and shows trusted action link", async () => {
    const ui = userEvent.setup();
    render(<AdminNotificationsClient />);
    await screen.findByRole("heading", { name: "Новый партнёр" });
    expect(api.fetchAdminNotifications).toHaveBeenCalledWith({
      unread: false,
      limit: 25,
      cursor: null,
    });
    await ui.click(screen.getByLabelText(/только непрочитанные/i));
    await waitFor(() =>
      expect(api.fetchAdminNotifications).toHaveBeenLastCalledWith({
        unread: true,
        limit: 25,
        cursor: null,
      }),
    );
    expect(screen.getByRole("link", { name: "Открыть карточку" })).toHaveAttribute(
      "href",
      "https://prof.remcard.ru/admin/moderation/partners/p-new",
    );
  });

  it("shows empty state separately from load failure", async () => {
    api.fetchAdminNotifications.mockResolvedValueOnce({ items: [], nextCursor: null });
    render(<AdminNotificationsClient />);
    expect(await screen.findByRole("status")).toHaveTextContent(/уведомлений пока нет/i);
  });

  it("does not drop unread on failed mark-read", async () => {
    api.markAdminNotificationRead.mockRejectedValueOnce(new Error("fail"));
    const ui = userEvent.setup();
    render(<AdminNotificationsClient />);
    await screen.findByRole("heading", { name: "Новый партнёр" });
    await ui.click(screen.getByRole("button", { name: "Прочитано" }));
    await screen.findByText(/не удалось отметить прочитанным/i);
    expect(screen.getByRole("heading", { name: "Новый партнёр" })).toBeTruthy();
  });

  it("ignores stale all-items fetch after switching to unread-only", async () => {
    let resolveAll: (value: { items: typeof item[]; nextCursor: null }) => void = () => {};
    const allPending = new Promise<{ items: (typeof item)[]; nextCursor: null }>((resolve) => {
      resolveAll = resolve;
    });
    const unreadRow = { ...item, id: "unread-1", title: "Непрочитанная строка", readAt: null };
    const readRow = {
      ...item,
      id: "read-1",
      title: "Уже прочитанная строка",
      readAt: "2026-10-28T10:00:00.000Z",
    };

    api.fetchAdminNotifications.mockImplementation(({ unread }) => {
      if (unread) {
        return Promise.resolve({ items: [unreadRow], nextCursor: null });
      }
      return allPending;
    });

    const ui = userEvent.setup();
    render(<AdminNotificationsClient />);
    await ui.click(screen.getByLabelText(/только непрочитанные/i));
    expect(await screen.findByRole("heading", { name: "Непрочитанная строка" })).toBeTruthy();

    resolveAll({ items: [readRow], nextCursor: null });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Уже прочитанная строка" })).toBeNull();
    });
    expect(screen.getByRole("heading", { name: "Непрочитанная строка" })).toBeTruthy();
  });

  it("loads next unread page after marking the last loaded row read", async () => {
    const firstUnread = { ...item, id: "page1", title: "Первое непрочитанное", readAt: null };
    const nextUnread = { ...item, id: "page2", title: "Следующее непрочитанное", readAt: null };
    let firstPageConsumed = false;

    api.fetchAdminNotifications.mockImplementation(({ unread, cursor }) => {
      if (!unread) {
        return Promise.resolve({ items: [firstUnread], nextCursor: null });
      }
      if (cursor === null) {
        if (!firstPageConsumed) {
          return Promise.resolve({ items: [firstUnread], nextCursor: "more" });
        }
        return Promise.resolve({ items: [], nextCursor: "more" });
      }
      if (cursor === "more") {
        return Promise.resolve({ items: [nextUnread], nextCursor: null });
      }
      return Promise.resolve({ items: [], nextCursor: null });
    });
    api.markAdminNotificationRead.mockImplementation(async () => {
      firstPageConsumed = true;
    });

    const ui = userEvent.setup();
    render(<AdminNotificationsClient />);
    await screen.findByRole("heading", { name: "Первое непрочитанное" });
    await ui.click(screen.getByLabelText(/только непрочитанные/i));
    await screen.findByRole("heading", { name: "Первое непрочитанное" });

    await ui.click(screen.getByRole("button", { name: "Прочитано" }));
    expect(await screen.findByRole("heading", { name: "Следующее непрочитанное" })).toBeTruthy();
    expect(screen.queryByText(/непрочитанных уведомлений нет/i)).toBeNull();
  });

  it("shows admin category from SYSTEM meta.kind instead of raw type", async () => {
    api.fetchAdminNotifications.mockResolvedValueOnce({
      items: [
        {
          ...item,
          type: "SYSTEM",
          title: "Проверочная регистрация",
          meta: { scope: "ADMIN", kind: "admin.new_client" },
        },
      ],
      nextCursor: null,
    });
    render(<AdminNotificationsClient />);
    await screen.findByRole("heading", { name: "Проверочная регистрация" });
    expect(screen.getByText("Новый клиент")).toBeTruthy();
    expect(screen.queryByText("SYSTEM")).toBeNull();
  });

  it("does not start messenger binding during initial inbox render", async () => {
    render(<AdminNotificationsClient />);
    await screen.findByRole("heading", { name: "Новый партнёр" });
    expect(api.startAdminNotificationBind).not.toHaveBeenCalled();
    expect(api.fetchAdminNotificationBindStatus).not.toHaveBeenCalled();
  });

  it("reports settings save failure without success message", async () => {
    api.patchAdminNotificationSettings.mockRejectedValueOnce(new Error("save failed"));
    const ui = userEvent.setup();
    render(<AdminNotificationsClient />);
    await screen.findByText("Настройки уведомлений");
    await ui.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/не удалось сохранить/i);
    expect(screen.queryByText("Настройки сохранены")).toBeNull();
  });
});
