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

export function whitelistTeamListResponse(raw: unknown): AdminTeamListResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { members: [] };
  }
  const body = raw as Record<string, unknown>;
  const list = Array.isArray(body.members) ? body.members : [];
  const members = list
    .map(whitelistTeamMember)
    .filter((m): m is AdminTeamMember => Boolean(m))
    .sort(compareTeamMembers);
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

export type AdminTeamErrorKind = "unauthorized" | "forbidden" | "error";

export function teamErrorKind(caught: unknown): AdminTeamErrorKind {
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
