import { remcardFetch } from "@/lib/api-client";

export type ProfNotificationAction = {
  requiresAction: boolean;
  actionLabel: string | null;
};

export type ProfNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  meta: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  action: ProfNotificationAction;
};

export type ProfNotificationsListResponse = {
  snapshotAt: string;
  nextCursor: string | null;
  items: ProfNotificationItem[];
};

export async function fetchProfUnreadCount(): Promise<number> {
  const data = await remcardFetch<{ count: number }>("/api/pro/notifications/unread-count");
  return typeof data.count === "number" ? data.count : 0;
}

export async function fetchProfNotifications(params: {
  unread?: boolean;
  limit?: number;
  cursor?: string | null;
}): Promise<ProfNotificationsListResponse> {
  const q = new URLSearchParams();
  if (params.unread) q.set("unread", "1");
  if (params.limit) q.set("limit", String(params.limit));
  if (params.cursor) q.set("cursor", params.cursor);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return remcardFetch<ProfNotificationsListResponse>(`/api/pro/notifications${suffix}`);
}

export async function markProfNotificationRead(id: string): Promise<void> {
  await remcardFetch(`/api/pro/notifications/${encodeURIComponent(id)}`, { method: "PATCH" });
}

export async function markAllProfNotificationsRead(snapshotBefore: string): Promise<void> {
  await remcardFetch("/api/pro/notifications", {
    method: "PATCH",
    body: { all: true, snapshotBefore },
  });
}
