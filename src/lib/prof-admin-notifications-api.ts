import { remcardFetch } from "@/lib/api-client";

export type AdminNotificationMessengerChannel = "telegram" | "max";

export type AdminNotificationSettings = {
  newClients: boolean;
  newPartners: boolean;
  partnerActivity: boolean;
  channels: AdminNotificationMessengerChannel[];
  activityFrequency: "daily";
};

export type AdminNotificationBindings = {
  telegramLinked: boolean;
  maxLinked: boolean;
};

export type AdminNotificationSettingsResponse = {
  settings: AdminNotificationSettings;
  bindings: AdminNotificationBindings;
};

export type AdminNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actionUrl: string | null;
  meta: unknown;
};

export type AdminNotificationsListResponse = {
  items: AdminNotificationItem[];
  nextCursor: string | null;
};

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettingsResponse> {
  return remcardFetch<AdminNotificationSettingsResponse>("/api/pro/admin/notification-settings");
}

export async function patchAdminNotificationSettings(body: {
  newClients: boolean;
  newPartners: boolean;
  partnerActivity: boolean;
  channels: AdminNotificationMessengerChannel[];
}): Promise<AdminNotificationSettingsResponse> {
  return remcardFetch<AdminNotificationSettingsResponse>("/api/pro/admin/notification-settings", {
    method: "PATCH",
    body,
  });
}

export async function fetchAdminUnreadNotificationCount(): Promise<number> {
  const data = await remcardFetch<{ count: number }>("/api/pro/admin/notifications/unread-count");
  return typeof data.count === "number" && Number.isFinite(data.count) ? data.count : 0;
}

export async function fetchAdminNotifications(params: {
  unread?: boolean;
  limit?: number;
  cursor?: string | null;
}): Promise<AdminNotificationsListResponse> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 25));
  if (params.unread) q.set("unread", "1");
  if (params.cursor) q.set("cursor", params.cursor);
  return remcardFetch<AdminNotificationsListResponse>(`/api/pro/admin/notifications?${q.toString()}`);
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await remcardFetch<{ ok: boolean }>(`/api/pro/admin/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await remcardFetch<{ ok: boolean }>("/api/pro/admin/notifications/mark-all-read", {
    method: "POST",
    body: {},
  });
}

export type AdminNotificationBindProvider = "TELEGRAM" | "MAX";

export type AdminNotificationBindStartResponse = {
  deepLink: string | null;
  startPayload: string;
  hint: string;
};

export async function fetchAdminNotificationBindStatus(): Promise<AdminNotificationBindings> {
  return remcardFetch<AdminNotificationBindings>("/api/pro/admin/notification-bind/status");
}

export async function startAdminNotificationBind(
  provider: AdminNotificationBindProvider,
): Promise<AdminNotificationBindStartResponse> {
  return remcardFetch<AdminNotificationBindStartResponse>("/api/pro/admin/notification-bind/start", {
    method: "POST",
    body: { provider },
  });
}
