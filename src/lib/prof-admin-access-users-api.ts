import { RemcardApiError, remcardFetch } from "@/lib/api-client";

/** Whitelist contract for OWNER admin provisioning (backend A10). */

export type AdminAccessStaffRole = "OWNER" | "ADMIN" | "OPERATOR" | "ANALYST";

export type AdminAccessViewer = {
  id: string;
  publicId: string;
  displayName: string;
  staffRole: AdminAccessStaffRole | null;
};

export type AdminAccessUserItem = {
  id: string;
  publicId: string;
  displayName: string;
  staffRole: AdminAccessStaffRole | null;
  accessState: "active" | "revoked" | "blocked";
  loginNormalized: string | null;
  credentialDisabledAt: string | null;
  isBlocked: boolean;
  createdAt: string;
};

export type AdminAccessUsersListResponse = {
  viewer: AdminAccessViewer | null;
  items: AdminAccessUserItem[];
};

export type AdminAccessCreateBody = {
  displayName: string;
  login: string;
  newPassword: string;
};

export type AdminAccessCreateResponse = {
  item: AdminAccessUserItem;
};

export type AdminAccessRevokeResponse = {
  ok: boolean;
  idempotent: boolean;
  item: AdminAccessUserItem;
};

const STAFF_ROLE_LABELS: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  OPERATOR: "Оператор",
  ANALYST: "Аналитик",
};

const ACCESS_STATE_LABELS: Record<string, string> = {
  active: "Доступ активен",
  revoked: "Доступ отключён",
  blocked: "Заблокирован",
};

/** Strip any accidental secret-like keys from API JSON before UI use. */
export function whitelistAccessUserItem(raw: unknown): AdminAccessUserItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.publicId !== "string") return null;
  if (typeof row.displayName !== "string") return null;
  if (
    row.accessState !== "active" &&
    row.accessState !== "revoked" &&
    row.accessState !== "blocked"
  ) {
    return null;
  }
  if (typeof row.isBlocked !== "boolean" || typeof row.createdAt !== "string") return null;
  const staffRole =
    row.staffRole === null || typeof row.staffRole === "string" ? row.staffRole : null;
  return {
    id: row.id,
    publicId: row.publicId,
    displayName: row.displayName,
    staffRole: (staffRole as AdminAccessStaffRole | null) ?? null,
    accessState: row.accessState,
    loginNormalized: typeof row.loginNormalized === "string" ? row.loginNormalized : null,
    credentialDisabledAt:
      typeof row.credentialDisabledAt === "string" ? row.credentialDisabledAt : null,
    isBlocked: row.isBlocked,
    createdAt: row.createdAt,
  };
}

export function labelStaffRole(role: string | null | undefined): string {
  if (role == null) return "нет роли";
  return STAFF_ROLE_LABELS[role] ?? role;
}

export function labelAccessState(state: string): string {
  return ACCESS_STATE_LABELS[state] ?? state;
}

export async function fetchAdminAccessUsers(signal?: AbortSignal) {
  return remcardFetch<AdminAccessUsersListResponse>("/api/pro/admin/access/users", {
    signal,
  });
}

export async function createAdminAccessUser(body: AdminAccessCreateBody, signal?: AbortSignal) {
  return remcardFetch<AdminAccessCreateResponse>("/api/pro/admin/access/users", {
    method: "POST",
    body,
    signal,
  });
}

export async function revokeAdminAccessUser(id: string, signal?: AbortSignal) {
  return remcardFetch<AdminAccessRevokeResponse>(
    `/api/pro/admin/access/users/${encodeURIComponent(id)}/revoke`,
    { method: "POST", signal },
  );
}

export function accessUsersErrorKind(error: unknown): "forbidden" | "unauthorized" | "conflict" | "validation" | "network" | "other" {
  if (!(error instanceof RemcardApiError)) return "other";
  if (error.status === 403) return "forbidden";
  if (error.status === 401) return "unauthorized";
  if (error.status === 409) return "conflict";
  if (error.status === 400) return "validation";
  if (error.status === 0) return "network";
  return "other";
}
