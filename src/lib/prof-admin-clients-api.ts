import { RemcardApiError, remcardFetch } from "@/lib/api-client";

/**
 * A21a–A21i readonly contract for GET /api/admin/users
 * (list/proxy staffAuth OPERATOR+; registration range BE tip A22g c5a41a20).
 *
 * - Clients list always forces role=CLIENT + funnelRole=CLIENT.
 * - Shared funnel snapshot: getAdminUserFunnel(CLIENT|PRO) — explicit role only.
 * - getAdminClientTotal stays all-time CLIENT total without period/search/funnel.
 * - Optional createdFrom/createdTo (A22g) for rolling registration windows.
 *   Never combine with legacy period=today|week|month (BE 400).
 *
 * Query params mirrored from BE route only: page, limit, role, period,
 * search, sort, order, funnel, funnelRole, createdFrom, createdTo.
 * There is no `q` param.
 *
 * Funnel keys (registered / profileFilled / firstAction / activeRecently) are
 * profile-lifecycle counts — never deal stages and never consent visits.
 * Funnel JSON remains all-time even when a registration range is applied.
 */

export type AdminClientPeriod = "all" | "today" | "week" | "month";
/** Frozen R1 rolling registration windows (civil days, including today). */
export type AdminClientRollingDays = 7 | 30 | 90;
export type AdminClientSort = "createdAt" | "displayName";
export type AdminClientOrder = "asc" | "desc";
export type AdminClientFunnelKey =
  | "registered"
  | "profileFilled"
  | "firstAction"
  | "activeRecently";

/** Europe/Moscow — no DST since 2014 (fixed UTC+3). */
export const ADMIN_CLIENTS_MSK_TIME_ZONE = "Europe/Moscow";
/** Fixed offset used for MSK civil-day ↔ UTC ISO (A22g inclusive instants). */
export const ADMIN_CLIENTS_MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Stable registration-range endpoints captured once per UI selection.
 * Reuse for table pages + CSV export — do not recompute mid-walk.
 */
export type AdminClientsRegistrationRange = {
  days: AdminClientRollingDays;
  /** Inclusive lower ISO instant (start of MSK civil day → UTC). */
  createdFrom: string;
  /** Inclusive upper ISO instant (end of MSK civil day → UTC). */
  createdTo: string;
  /** MSK civil YYYY-MM-DD for the first day of the window. */
  mskFrom: string;
  /** MSK civil YYYY-MM-DD for today (last day, inclusive). */
  mskTo: string;
  /** Always equals `days` when built by resolveAdminClientsRegistrationRange. */
  inclusiveDayCount: number;
};

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

/** Explicit role for shared funnel snapshot (Analytics may switch CLIENT|PRO). */
export type AdminUserFunnelRole = "CLIENT" | "PRO";

/**
 * Lifecycle funnel from BE response key `funnel`.
 * Requires `funnelRole=CLIENT|PRO` — never treat as deal stage / consent visits.
 */
export type AdminUserFunnel = {
  registered: number;
  profileFilled: number;
  firstAction: number;
  activeRecently: number;
  pctProfile: number;
  pctFirst: number;
  pctActive: number;
};

/** @deprecated Alias — prefer AdminUserFunnel (A21d shared reader). */
export type AdminClientsFunnel = AdminUserFunnel;

export type AdminClientsListResponse = {
  users: AdminClient[];
  /** Always BE `total` for the request — never `users.length`. */
  total: number;
  page: number;
  totalPages: number;
  /** Null when BE omitted/malformed funnel — never invent zeros for deal stages. */
  funnel: AdminClientsFunnel | null;
};

export type AdminClientsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  period?: AdminClientPeriod;
  /**
   * A22g optional registration bounds (ISO instant or YYYY-MM-DD).
   * When either is set, legacy period must be absent/`all` — never today|week|month.
   */
  createdFrom?: string;
  createdTo?: string;
  sort?: AdminClientSort;
  order?: AdminClientOrder;
  /** BE lifecycle funnel filter — not frozen deal stage. */
  funnel?: AdminClientFunnelKey | "all";
  signal?: AbortSignal;
};

const PERIODS: ReadonlySet<string> = new Set(["all", "today", "week", "month"]);
const SORTS: ReadonlySet<string> = new Set(["createdAt", "displayName"]);
const ORDERS: ReadonlySet<string> = new Set(["asc", "desc"]);
const FUNNELS: ReadonlySet<string> = new Set([
  "registered",
  "profileFilled",
  "firstAction",
  "activeRecently",
]);

/** Default page size mirrors frozen R1 clients table (10). BE max is 100. */
export const ADMIN_CLIENTS_DEFAULT_LIMIT = 10;

export const ADMIN_CLIENT_FUNNEL_LABELS: Record<AdminClientFunnelKey, string> = {
  registered: "Регистрация",
  profileFilled: "Заполнил профиль",
  firstAction: "Первое действие",
  activeRecently: "Активен 7д",
};

/**
 * Frozen R1 clientsView ↔ GET /api/admin/users mapping (A21c).
 * Only «match» rows may be shown under frozen-equivalent titles.
 */
export const ADMIN_CLIENTS_FROZEN_MAPPING = [
  {
    frozen: "KPI «Клиентов в базе»",
    be: "funnel.registered with funnelRole=CLIENT (all-time CLIENT count)",
    verdict: "match" as const,
  },
  {
    frozen: "KPI «Новые за период» / 7·30·90",
    be: "total with role=CLIENT + createdFrom/createdTo (A22g) on User.createdAt — not activity",
    verdict: "match" as const,
  },
  {
    frozen: "Legacy calendar period today|week|month",
    be: "period=today|week|month on createdAt (unchanged); never combine with createdFrom/To",
    verdict: "match" as const,
  },
  {
    frozen: "KPI «С заявками» / stage=order",
    be: "no deal-stage field on users list; funnel.firstAction ≠ заявка",
    verdict: "gap" as const,
  },
  {
    frozen: "KPI «Завершённые сделки» / stage=done",
    be: "no deal completion on users list",
    verdict: "gap" as const,
  },
  {
    frozen: "Column/card «Источник» (partner)",
    be: "users select has no recommending partner id/name",
    verdict: "gap" as const,
  },
  {
    frozen: "Column/filter «Этап» new|contact|order|done",
    be: "funnel=registered|profileFilled|firstAction|activeRecently is profile lifecycle, not deal stage",
    verdict: "gap" as const,
  },
  {
    frozen: "Column «Активность*» with consent",
    be: "funnel.activeRecently uses updatedAt; no consent gate in this DTO",
    verdict: "gap" as const,
  },
  {
    frozen: "Search client/partner/city",
    be: "search= matches displayName only",
    verdict: "partial" as const,
  },
] as const;

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

export function labelClientRollingDays(days: AdminClientRollingDays): string {
  switch (days) {
    case 7:
      return "7 дней";
    case 30:
      return "30 дней";
    case 90:
      return "90 дней";
  }
}

/** MSK civil YYYY-MM-DD for an instant. */
export function adminClientsMskCivilDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_CLIENTS_MSK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function parseIsoCalendarDate(ymd: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new TypeError(`invalid civil date: ${ymd}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Start of MSK civil day as UTC ISO instant. */
export function adminClientsMskDayStartIso(ymd: string): string {
  const { y, m, d } = parseIsoCalendarDate(ymd);
  const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - ADMIN_CLIENTS_MSK_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/** Inclusive end of MSK civil day as UTC ISO instant (last ms). */
export function adminClientsMskDayEndInclusiveIso(ymd: string): string {
  const { y, m, d } = parseIsoCalendarDate(ymd);
  const nextUtcMs = Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0) - ADMIN_CLIENTS_MSK_OFFSET_MS;
  return new Date(nextUtcMs - 1).toISOString();
}

function shiftCivilDate(ymd: string, deltaDays: number): string {
  const { y, m, d } = parseIsoCalendarDate(ymd);
  const probe = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = probe.getUTCFullYear();
  const mm = String(probe.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(probe.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Inclusive civil-day count between two YYYY-MM-DD dates (MSK calendar labels).
 * N-day window uses start = today − (N − 1) so length === N (author Aug3–Nov1 was 91).
 */
export function adminClientsInclusiveCivilDayCount(fromYmd: string, toYmd: string): number {
  const a = parseIsoCalendarDate(fromYmd);
  const b = parseIsoCalendarDate(toYmd);
  const aUtc = Date.UTC(a.y, a.m - 1, a.d);
  const bUtc = Date.UTC(b.y, b.m - 1, b.d);
  return Math.floor((bUtc - aUtc) / 86_400_000) + 1;
}

/**
 * Frozen R1 rolling registration window on User.createdAt (not activity).
 * Captures stable ISO endpoints for list + CSV — call once per UI selection.
 *
 * Formula: days N including today → mskFrom = todayMSK − (N − 1), mskTo = todayMSK.
 */
export function resolveAdminClientsRegistrationRange(
  days: AdminClientRollingDays,
  now: Date = new Date(),
): AdminClientsRegistrationRange {
  if (days !== 7 && days !== 30 && days !== 90) {
    throw new TypeError("registration window days must be 7, 30, or 90");
  }
  const mskTo = adminClientsMskCivilDate(now);
  const mskFrom = shiftCivilDate(mskTo, -(days - 1));
  const inclusiveDayCount = adminClientsInclusiveCivilDayCount(mskFrom, mskTo);
  if (inclusiveDayCount !== days) {
    throw new Error(
      `registration window length mismatch: expected ${days}, got ${inclusiveDayCount} (${mskFrom}…${mskTo})`,
    );
  }
  return {
    days,
    mskFrom,
    mskTo,
    createdFrom: adminClientsMskDayStartIso(mskFrom),
    createdTo: adminClientsMskDayEndInclusiveIso(mskTo),
    inclusiveDayCount,
  };
}

export function labelClientFunnel(funnel: AdminClientFunnelKey | "all"): string {
  if (funnel === "all") return "Все этапы регистрации";
  return ADMIN_CLIENT_FUNNEL_LABELS[funnel];
}

/** Coerce BE total: number | numeric string | null/undefined → non-negative int. */
export function parseAdminClientsTotal(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return 0;
}

/** Parse BE funnel object; return null if incomplete — never invent deal KPIs. */
export function parseAdminUserFunnel(raw: unknown): AdminUserFunnel | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const registered = parseAdminClientsTotal(body.registered);
  const profileFilled = parseAdminClientsTotal(body.profileFilled);
  const firstAction = parseAdminClientsTotal(body.firstAction);
  const activeRecently = parseAdminClientsTotal(body.activeRecently);
  // Require the four stage counts to be present as finite numbers/strings.
  const hasAll = (["registered", "profileFilled", "firstAction", "activeRecently"] as const).every(
    (k) => body[k] !== undefined && body[k] !== null,
  );
  if (!hasAll) return null;
  return {
    registered,
    profileFilled,
    firstAction,
    activeRecently,
    pctProfile: parseAdminClientsTotal(body.pctProfile),
    pctFirst: parseAdminClientsTotal(body.pctFirst),
    pctActive: parseAdminClientsTotal(body.pctActive),
  };
}

/** @deprecated Alias — prefer parseAdminUserFunnel. */
export const parseAdminClientsFunnel = parseAdminUserFunnel;

export function assertAdminUserFunnelRole(raw: unknown): AdminUserFunnelRole {
  if (raw === "CLIENT" || raw === "PRO") return raw;
  throw new TypeError("getAdminUserFunnel requires explicit funnelRole CLIENT|PRO");
}

/** Build snapshot query — page=1&limit=1&role&funnelRole, no period/search/funnel filter. */
export function buildAdminUserFunnelQueryString(funnelRole: AdminUserFunnelRole): string {
  const role = assertAdminUserFunnelRole(funnelRole);
  const params = new URLSearchParams();
  params.set("role", role);
  params.set("funnelRole", role);
  params.set("page", "1");
  params.set("limit", "1");
  return params.toString();
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
    return { users: [], total: 0, page: 1, totalPages: 1, funnel: null };
  }
  const body = raw as Record<string, unknown>;
  const list = Array.isArray(body.users) ? body.users : [];
  const users = list.map(whitelistAdminClient).filter((u): u is AdminClient => Boolean(u));
  const total = parseAdminClientsTotal(body.total);
  const page =
    typeof body.page === "number" && Number.isFinite(body.page)
      ? Math.max(1, Math.floor(body.page))
      : 1;
  const totalPagesRaw = body.totalPages;
  const totalPages =
    typeof totalPagesRaw === "number" && Number.isFinite(totalPagesRaw)
      ? Math.max(1, Math.floor(totalPagesRaw))
      : Math.max(1, Math.ceil(total / ADMIN_CLIENTS_DEFAULT_LIMIT) || 1);
  return {
    users,
    total,
    page,
    totalPages,
    funnel: parseAdminUserFunnel(body.funnel),
  };
}

function normalizeCreatedBound(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeQuery(q: AdminClientsQuery = {}): Required<
  Omit<AdminClientsQuery, "signal" | "search" | "funnel" | "createdFrom" | "createdTo">
> & {
  search: string;
  funnel: AdminClientFunnelKey | "all";
  createdFrom?: string;
  createdTo?: string;
} {
  const page = Math.max(1, Math.floor(q.page ?? 1) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(q.limit ?? ADMIN_CLIENTS_DEFAULT_LIMIT) || ADMIN_CLIENTS_DEFAULT_LIMIT),
  );
  const period = PERIODS.has(q.period ?? "") ? (q.period as AdminClientPeriod) : "all";
  const sort = SORTS.has(q.sort ?? "") ? (q.sort as AdminClientSort) : "createdAt";
  const order = ORDERS.has(q.order ?? "") ? (q.order as AdminClientOrder) : "desc";
  const search = (q.search ?? "").trim();
  const funnel = FUNNELS.has(q.funnel ?? "") ? (q.funnel as AdminClientFunnelKey) : "all";
  const createdFrom = normalizeCreatedBound(q.createdFrom);
  const createdTo = normalizeCreatedBound(q.createdTo);
  return { page, limit, period, sort, order, search, funnel, createdFrom, createdTo };
}

/**
 * Build query string — role=CLIENT and funnelRole=CLIENT are always forced.
 * Uses `search`, not `q`. Optional `funnel` is lifecycle stage only.
 * Optional A22g `createdFrom`/`createdTo` omit legacy `period` (never combine).
 */
export function buildAdminClientsQueryString(q: AdminClientsQuery = {}): string {
  const n = normalizeQuery(q);
  const hasRange = Boolean(n.createdFrom || n.createdTo);
  if (hasRange && n.period !== "all") {
    throw new TypeError(
      "Do not combine createdFrom/createdTo with period=today|week|month (BE returns 400)",
    );
  }
  const params = new URLSearchParams();
  params.set("role", "CLIENT");
  params.set("funnelRole", "CLIENT");
  params.set("page", String(n.page));
  params.set("limit", String(n.limit));
  if (!hasRange && n.period !== "all") params.set("period", n.period);
  if (n.createdFrom) params.set("createdFrom", n.createdFrom);
  if (n.createdTo) params.set("createdTo", n.createdTo);
  if (n.search) params.set("search", n.search);
  if (n.funnel !== "all") params.set("funnel", n.funnel);
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

export function isAbortError(caught: unknown): boolean {
  if (!caught || typeof caught !== "object") return false;
  const name = (caught as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
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
 * A20c KPI handoff: **all-time** CLIENT total.
 * Always `role=CLIENT&page=1&limit=1` with no `period` / `search` / `funnel` —
 * never “all users” and never registrations of the selected overview period.
 */
export async function getAdminClientTotal(signal?: AbortSignal): Promise<number> {
  const params = new URLSearchParams();
  params.set("role", "CLIENT");
  params.set("page", "1");
  params.set("limit", "1");
  const raw = await remcardFetch<unknown>(`/api/admin/users?${params.toString()}`, { signal });
  return whitelistAdminClientsResponse(raw).total;
}

/**
 * A21d shared readonly funnel reader for Clients + Analytics.
 *
 * Exact BFF: `GET /api/admin/users?role=&funnelRole=&page=1&limit=1`
 * with **explicit** `CLIENT` or `PRO` only (never `all`, never omitted).
 * Does not apply period/search. Returns BE `funnel` lifecycle snapshot or null.
 *
 * Replaces competing analytics-local readers (`adminAnalyticsUsersFunnel.ts`).
 * Analytics must import this export — do not fork a second implementation.
 */
export async function getAdminUserFunnel(
  funnelRole: AdminUserFunnelRole,
  signal?: AbortSignal,
): Promise<AdminUserFunnel | null> {
  const qs = buildAdminUserFunnelQueryString(funnelRole);
  const raw = await remcardFetch<unknown>(`/api/admin/users?${qs}`, { signal });
  return whitelistAdminClientsResponse(raw).funnel;
}

/** Convenience: CLIENT-only funnel snapshot (same as getAdminUserFunnel("CLIENT")). */
export async function getAdminClientFunnel(signal?: AbortSignal): Promise<AdminUserFunnel | null> {
  return getAdminUserFunnel("CLIENT", signal);
}
