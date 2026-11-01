import { RemcardApiError, remcardFetch } from "@/lib/api-client";

/** Readonly A17a contract for GET /api/admin/team (staffAuth, OPERATOR+ on BE). */

export type AdminTeamStaffRole = "OWNER" | "ADMIN" | "OPERATOR" | "ANALYST";

export type AdminTeamMember = {
  id: string;
  publicId: string;
  displayName: string;
  staffRole: AdminTeamStaffRole;
  staffAvatarUrl: string | null;
  staffPosition: string | null;
  staffTelegram: string | null;
  staffBio: string | null;
  staffStartDate: string | null;
  createdAt: string;
};

export type AdminTeamListResponse = {
  members: AdminTeamMember[];
};

const STAFF_ROLE_LABELS: Record<AdminTeamStaffRole, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  OPERATOR: "Оператор",
  ANALYST: "Аналитик",
};

const ROLE_ORDER: Record<AdminTeamStaffRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  OPERATOR: 2,
  ANALYST: 3,
};

export function labelTeamStaffRole(role: string | null | undefined): string {
  if (!role) return "Роль не указана";
  return STAFF_ROLE_LABELS[role as AdminTeamStaffRole] ?? role;
}

/** Frozen R1 card note — invitation sets role; no direction binding in this block. */
export const TEAM_R1_CARD_ROLE_NOTE =
  "Роль задаётся приглашением, без привязки к направлению";

/** Frozen R1 page lead (directions named; curator assignment stays out of R1 UI). */
export const TEAM_R1_PAGE_LEAD = "Люди, направления и доступ";

/**
 * Role legend from roles actually present in the GET list (OWNER→ANALYST order).
 * Does not invent closed-access counts or curator directions.
 */
export function teamRoleLegend(members: readonly AdminTeamMember[]): string {
  const present = new Set(members.map((m) => m.staffRole));
  const labels = (Object.keys(ROLE_ORDER) as AdminTeamStaffRole[])
    .filter((role) => present.has(role))
    .map((role) => STAFF_ROLE_LABELS[role]);
  return labels.length > 0 ? labels.join(" · ") : "—";
}

export function compareTeamMembers(a: AdminTeamMember, b: AdminTeamMember): number {
  const ra = ROLE_ORDER[a.staffRole] ?? 99;
  const rb = ROLE_ORDER[b.staffRole] ?? 99;
  if (ra !== rb) return ra - rb;
  return a.createdAt.localeCompare(b.createdAt);
}

export function teamMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

/** Whitelist trustworthy list fields; drop balances and unknown keys. */
export function whitelistTeamMember(raw: unknown): AdminTeamMember | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.publicId !== "string") return null;
  if (typeof row.displayName !== "string") return null;
  if (
    row.staffRole !== "OWNER" &&
    row.staffRole !== "ADMIN" &&
    row.staffRole !== "OPERATOR" &&
    row.staffRole !== "ANALYST"
  ) {
    return null;
  }
  if (typeof row.createdAt !== "string") return null;
  return {
    id: row.id,
    publicId: row.publicId,
    displayName: row.displayName,
    staffRole: row.staffRole,
    staffAvatarUrl: typeof row.staffAvatarUrl === "string" ? row.staffAvatarUrl : null,
    staffPosition: typeof row.staffPosition === "string" ? row.staffPosition : null,
    staffTelegram: typeof row.staffTelegram === "string" ? row.staffTelegram : null,
    staffBio: typeof row.staffBio === "string" ? row.staffBio : null,
    staffStartDate: typeof row.staffStartDate === "string" ? row.staffStartDate : null,
    createdAt: row.createdAt,
  };
}

/** User-facing load failure — never surface raw API/parse internals. */
export const TEAM_LOAD_FAILED_MESSAGE = "Не удалось загрузить команду";

/**
 * A17d: malformed 200 body must not collapse to a false empty list.
 * Thrown by whitelistTeamListResponse / fetchAdminTeam (fail-closed).
 */
export class AdminTeamResponseError extends Error {
  readonly code = "ADMIN_TEAM_RESPONSE_INVALID" as const;
  constructor() {
    super(TEAM_LOAD_FAILED_MESSAGE);
    this.name = "AdminTeamResponseError";
  }
}

/**
 * Strict list parse (A17d, fail-closed whole list):
 * - Genuine `{ members: [] }` → empty OK
 * - Missing/non-array `members`, non-object body, or any invalid required row → throw
 * - Valid null optionals + unknown extra keys still whitelisted per row
 */
export function whitelistTeamListResponse(raw: unknown): AdminTeamListResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdminTeamResponseError();
  }
  const body = raw as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(body, "members")) {
    throw new AdminTeamResponseError();
  }
  if (!Array.isArray(body.members)) {
    throw new AdminTeamResponseError();
  }
  const members: AdminTeamMember[] = [];
  for (const row of body.members) {
    const parsed = whitelistTeamMember(row);
    if (!parsed) {
      // Prefer whole-list reject over silently dropping bad rows (false totals).
      throw new AdminTeamResponseError();
    }
    members.push(parsed);
  }
  members.sort(compareTeamMembers);
  return { members };
}

export function filterTeamMembers(
  members: readonly AdminTeamMember[],
  query: string,
): AdminTeamMember[] {
  const q = query.trim().toLocaleLowerCase("ru");
  if (!q) return [...members];
  return members.filter((m) => {
    const hay = `${m.displayName} ${m.publicId} ${labelTeamStaffRole(m.staffRole)} ${m.staffPosition ?? ""}`
      .toLocaleLowerCase("ru");
    return hay.includes(q);
  });
}

export type AdminTeamErrorKind = "unauthorized" | "forbidden" | "error" | "aborted";

export function teamErrorKind(caught: unknown): AdminTeamErrorKind {
  if (
    (caught instanceof DOMException && caught.name === "AbortError") ||
    (caught instanceof Error && caught.name === "AbortError")
  ) {
    return "aborted";
  }
  if (caught instanceof RemcardApiError) {
    if (caught.status === 401) return "unauthorized";
    if (caught.status === 403) return "forbidden";
  }
  return "error";
}

export async function fetchAdminTeam(signal?: AbortSignal): Promise<AdminTeamListResponse> {
  const raw = await remcardFetch<unknown>("/api/admin/team", { signal });
  return whitelistTeamListResponse(raw);
}
