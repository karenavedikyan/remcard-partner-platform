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
