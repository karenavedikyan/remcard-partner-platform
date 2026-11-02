import type { AdminSettingsPartnerKind } from "./adminSettingsCopy";

export type AdminSettingsTab = "types" | "development" | "audit";

export const ADMIN_SETTINGS_AUDIT_TITLE = "Журнал изменений административных доступов";

export const ADMIN_SETTINGS_AUDIT_SCOPE_NOTE =
  "Только записи ADMIN_USER_UPDATED: кто изменил доступ сотрудника платформы и кого затронуло. Это не история партнёров, модерации или всего проекта.";

export const ADMIN_SETTINGS_AUDIT_FORBIDDEN =
  "Журнал доступен только руководителю и администратору платформы (OWNER/ADMIN).";

export const ADMIN_SETTINGS_AUDIT_PROXY_BLOCKED =
  "Чтение журнала через BFF недоступно на этой сборке.";

export type StaffAccessAuditRow = {
  id: string;
  occurredAt: string | null;
  actionLabel: string;
  targetLabel: string | null;
  actorLabel: string | null;
  detailLine: string | null;
};

export type StaffAccessAuditPage = {
  items: StaffAccessAuditRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type StaffAccessAuditParseResult =
  | { ok: true; page: StaffAccessAuditPage }
  | { ok: false; kind: "error"; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

function formatStaffIdentity(value: unknown): string | null {
  const o = asRecord(value);
  if (!o) return null;
  const name = pickString(o.displayName);
  const publicId = pickString(o.publicId);
  if (name && publicId) return `${name} (${publicId})`;
  return name ?? publicId;
}

export function labelStaffAccessAuditAction(action: string): string {
  if (action === "ADMIN_USER_UPDATED") return "Изменение доступа администратора";
  return action;
}

/** Safe subset of audit meta — no credentials, contacts, or raw JSON blobs. */
export function formatStaffAccessAuditMetaDetail(meta: unknown): string | null {
  const o = asRecord(meta);
  if (!o) return null;
  const parts: string[] = [];
  const rawFields = o.changedFields;
  if (Array.isArray(rawFields)) {
    const safeFields = new Set(["role", "staffRole", "staffPosition", "isBlocked"]);
    const fields = rawFields
      .filter((f): f is string => typeof f === "string")
      .map((f) => f.trim())
      .filter((f, index, all) => safeFields.has(f) && all.indexOf(f) === index);
    if (fields.length > 0) parts.push(`Изменённые поля: ${fields.join(", ")}`);
  }
  if (o.sessionInvalidated === true) parts.push("Сессии пользователя сброшены");
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Parses GET /api/pro/admin/access/audit (keyset items + nextCursor). */
export function parseStaffAccessAuditResponse(body: unknown): StaffAccessAuditParseResult {
  const root = asRecord(body);
  if (!root) {
    return {
      ok: false,
      kind: "error",
      message: "Ответ журнала не содержит список действий.",
    };
  }
  const rawItems = root.items;
  if (!rawItems || !Array.isArray(rawItems)) {
    return {
      ok: false,
      kind: "error",
      message: "Ответ журнала не содержит список действий.",
    };
  }
  const items: StaffAccessAuditRow[] = [];
  const invalid = (): StaffAccessAuditParseResult => ({
    ok: false,
    kind: "error",
    message: "Некорректный формат журнала изменений доступа.",
  });
  const hasMore = root.hasMore;
  const nextCursor = root.nextCursor === null ? null : pickString(root.nextCursor);
  if (
    typeof hasMore !== "boolean" ||
    (root.nextCursor !== null && typeof root.nextCursor !== "string") ||
    (hasMore && (!nextCursor || rawItems.length === 0)) ||
    (!hasMore && root.nextCursor !== null)
  ) return invalid();
  const seenIds = new Set<string>();
  for (const row of rawItems) {
    const o = asRecord(row);
    if (!o) return invalid();
    const id = pickString(o.id);
    const action = pickString(o.action);
    const occurredAt = pickString(o.createdAt) ?? pickString(o.occurredAt);
    if (
      !id || seenIds.has(id) ||
      action !== "ADMIN_USER_UPDATED" ||
      !occurredAt || Number.isNaN(Date.parse(occurredAt))
    ) return invalid();
    seenIds.add(id);
    items.push({
      id,
      occurredAt,
      actionLabel: labelStaffAccessAuditAction(action),
      targetLabel: formatStaffIdentity(o.target) ?? formatStaffIdentity(o.user),
      actorLabel: formatStaffIdentity(o.actor),
      detailLine: formatStaffAccessAuditMetaDetail(o.meta),
    });
  }
  return { ok: true, page: { items, nextCursor, hasMore } };
}

export function buildStaffAccessAuditPath(limit: number, cursor: string | null): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `/api/pro/admin/access/audit?${qs}` : "/api/pro/admin/access/audit";
}

export function adminSettingsTabLabel(tab: AdminSettingsTab): string {
  switch (tab) {
    case "types":
      return "Типы партнёров";
    case "development":
      return "Релизы и развитие";
    case "audit":
      return "Журнал действий";
    default:
      return tab;
  }
}

export function partnerKindEnabledLabel(_kind: AdminSettingsPartnerKind): "Включён" {
  return "Включён";
}
