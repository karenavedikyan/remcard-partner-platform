export type {
  AdminNotificationSettingsResponse,
  AdminNotificationBindings,
} from "../../../src/lib/prof-admin-notifications-api";

const inboxItem = {
  id: "n-harness",
  type: "NEW_PARTNER",
  title: "Новый партнёр зарегистрирован",
  body: "Live-регистрация завершена, требуется модерация карточки.",
  createdAt: "2026-10-28T09:00:00.000Z",
  readAt: null,
  actionUrl: "https://prof.remcard.ru/admin/moderation/partners/u-pending",
  meta: null,
};

export async function fetchAdminNotificationSettings() {
  return {
    settings: {
      newClients: true,
      newPartners: true,
      partnerActivity: false,
      channels: ["email"],
      activityFrequency: "daily" as const,
    },
    bindings: { telegramLinked: false, maxLinked: false },
  };
}

export async function patchAdminNotificationSettings(body: unknown) {
  return { settings: body, bindings: { telegramLinked: false, maxLinked: false } };
}

export async function fetchAdminUnreadNotificationCount() {
  return 2;
}

export async function fetchAdminNotifications() {
  return { items: [inboxItem], nextCursor: null };
}

export async function markAdminNotificationRead() {}

export async function markAllAdminNotificationsRead() {}

export async function fetchAdminNotificationBindStatus() {
  return { telegramLinked: false, maxLinked: false };
}

export async function startAdminNotificationBind() {
  return { url: "https://example.com/bind-harness" };
}
