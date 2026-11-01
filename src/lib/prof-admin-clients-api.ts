import { RemcardApiError, remcardFetch } from "@/lib/api-client";

/**
 * A21a readonly contract for GET /api/admin/users?role=CLIENT
 * (staffAuth OPERATOR+ on BE tip 7978e2e). Always forces role=CLIENT —
 * never loads unscoped / PRO / STAFF lists as a fallback.
 */

export type AdminClientPeriod = "all" | "today" | "week" | "month";
export type AdminClientSort = "createdAt" | "displayName";
export type AdminClientOrder = "asc" | "desc";

export type AdminClient = {
  id: string;
  publicId: string;
  displayName: string;
  role: "CLIENT";
  city: string | null;
  photoUrl: string | null;
  clientAvatarUrl: string | null;
  isBlocked: boolean;
  createdAt: string;
};

export type AdminClientsListResponse = {
  users: AdminClient[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminClientsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  period?: AdminClientPeriod;
  sort?: AdminClientSort;
  order?: AdminClientOrder;
  signal?: AbortSignal;
};

const PERIODS: ReadonlySet<string> = new Set(["all", "today", "week", "month"]);
const SORTS: ReadonlySet<string> = new Set(["createdAt", "displayName"]);
const ORDERS: ReadonlySet<string> = new Set(["asc", "desc"]);

/** Default page size mirrors frozen R1 clients table (10). BE max is 100. */
export const ADMIN_CLIENTS_DEFAULT_LIMIT = 10;

export function clientAvatarUrl(client: AdminClient): string | null {
  return client.clientAvatarUrl || client.photoUrl || null;
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function formatClientRegisteredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Дата неизвестна";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function labelClientPeriod(period: AdminClientPeriod): string {
  switch (period) {
    case "today":
      return "Сегодня";
    case "week":
      return "Эта неделя";
    case "month":
      return "Этот месяц";
    default:
      return "Все периоды";
  }
}

/** Whitelist trustworthy CLIENT row fields only — drop PRO/staff and inventable keys. */
export function whitelistAdminClient(raw: unknown): AdminClient | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.publicId !== "string") return null;
  if (typeof row.displayName !== "string") return null;
  if (row.role !== "CLIENT") return null;
  if (typeof row.createdAt !== "string") return null;
  return {
    id: row.id,
    publicId: row.publicId,
    displayName: row.displayName,
    role: "CLIENT",
    city: typeof row.city === "string" && row.city.trim() ? row.city : null,
    photoUrl: typeof row.photoUrl === "string" ? row.photoUrl : null,
    clientAvatarUrl: typeof row.clientAvatarUrl === "string" ? row.clientAvatarUrl : null,
    isBlocked: row.isBlocked === true,
    createdAt: row.createdAt,
  };
}

export function whitelistAdminClientsResponse(raw: unknown): AdminClientsListResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { users: [], total: 0, page: 1, totalPages: 1 };
  }
  const body = raw as Record<string, unknown>;
  const list = Array.isArray(body.users) ? body.users : [];
  const users = list.map(whitelistAdminClient).filter((u): u is AdminClient => Boolean(u));
  const total = typeof body.total === "number" && Number.isFinite(body.total) ? Math.max(0, body.total) : 0;
  const page = typeof body.page === "number" && Number.isFinite(body.page) ? Math.max(1, body.page) : 1;
  const totalPages =
    typeof body.totalPages === "number" && Number.isFinite(body.totalPages)
      ? Math.max(1, body.totalPages)
      : Math.max(1, Math.ceil(total / ADMIN_CLIENTS_DEFAULT_LIMIT) || 1);
  return { users, total, page, totalPages };
}

function normalizeQuery(q: AdminClientsQuery = {}): Required<
  Omit<AdminClientsQuery, "signal" | "search">
> & { search: string } {
  const page = Math.max(1, Math.floor(q.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(q.limit ?? ADMIN_CLIENTS_DEFAULT_LIMIT) || ADMIN_CLIENTS_DEFAULT_LIMIT));
  const period = PERIODS.has(q.period ?? "") ? (q.period as AdminClientPeriod) : "all";
  const sort = SORTS.has(q.sort ?? "") ? (q.sort as AdminClientSort) : "createdAt";
  const order = ORDERS.has(q.order ?? "") ? (q.order as AdminClientOrder) : "desc";
  const search = (q.search ?? "").trim();
  return { page, limit, period, sort, order, search };
}

/** Build query string — role=CLIENT is always forced and never omitted. */
export function buildAdminClientsQueryString(q: AdminClientsQuery = {}): string {
  const n = normalizeQuery(q);
  const params = new URLSearchParams();
  params.set("role", "CLIENT");
  params.set("page", String(n.page));
  params.set("limit", String(n.limit));
  if (n.period !== "all") params.set("period", n.period);
  if (n.search) params.set("search", n.search);
  if (n.sort !== "createdAt") params.set("sort", n.sort);
  if (n.order !== "desc") params.set("order", n.order);
  return params.toString();
}

export type AdminClientsErrorKind = "unauthorized" | "forbidden" | "error";

export function clientsErrorKind(caught: unknown): AdminClientsErrorKind {
  if (caught instanceof RemcardApiError) {
    if (caught.status === 401) return "unauthorized";
    if (caught.status === 403) return "forbidden";
  }
  return "error";
}

export async function fetchAdminClients(
  query: AdminClientsQuery = {},
): Promise<AdminClientsListResponse> {
  const qs = buildAdminClientsQueryString(query);
  const raw = await remcardFetch<unknown>(`/api/admin/users?${qs}`, {
    signal: query.signal,
  });
  return whitelistAdminClientsResponse(raw);
}

/**
 * Honest CLIENT total for overview KPI handoff (A20b).
 * Same exact GET with role=CLIENT and minimal limit — uses BE `total`.
 */
export async function getAdminClientTotal(signal?: AbortSignal): Promise<number> {
  const res = await fetchAdminClients({ page: 1, limit: 1, period: "all", signal });
  return res.total;
}
