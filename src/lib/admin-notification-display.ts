import type { AdminNotificationItem } from "@/lib/prof-admin-notifications-api";

const KIND_LABELS: Record<string, string> = {
  "admin.new_client": "Новый клиент",
  "admin.new_partner": "Новый партнёр",
  "admin.partner_activity": "Активность партнёра",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_CLIENT: "Новый клиент",
  NEW_PARTNER: "Новый партнёр",
  PARTNER_ACTIVITY: "Активность партнёра",
  new_client: "Новый клиент",
  new_partner: "Новый партнёр",
  partner_activity: "Активность партнёра",
};

function metaKind(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const kind = (meta as Record<string, unknown>).kind;
  return typeof kind === "string" && kind.trim() ? kind.trim() : null;
}

export function adminNotificationCategoryLabel(item: Pick<AdminNotificationItem, "type" | "meta">): string {
  const kind = metaKind(item.meta);
  if (kind && KIND_LABELS[kind]) return KIND_LABELS[kind];
  const typeKey = item.type?.trim() ?? "";
  if (TYPE_LABELS[typeKey]) return TYPE_LABELS[typeKey];
  if (typeKey === "SYSTEM" && kind) return kind;
  return typeKey || "—";
}
