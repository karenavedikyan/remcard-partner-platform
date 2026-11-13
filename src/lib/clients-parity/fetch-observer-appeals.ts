import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import type {
  ObserverPartnerMeta,
  ObserverPersonalMeta,
  ObserverReferredAppeal,
} from "./types";

/**
 * K8 canonical source (candidate, not release):
 * `karenavedikyan/remcard-navigator` @ `fc33b4fae859fb692757807c3b27696b66d57558`
 * — `src/lib/clientAppeals/contract.ts`, `HANDOFF.md`.
 * P2 BFF forwards K2 observer GET; this adapter maps wire → UI view-model only.
 */
export const OBSERVER_REFERRED_APPEALS_LIST_PATH = "/api/pro/referred-appeals";

/** Receiving / finance fields that must never enter observer UI state (K8 strict DTO). */
export const OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS = [
  "privateNotes",
  "clientContact",
  "paidAmountKopecks",
  "purchaseOrderId",
  "paidAt",
  "discountPercent",
  "certValidUntil",
  "clientCity",
  "budgetHint",
  "receivingOrganizationId",
  "manualSourceKey",
  "originKind",
  "refusedReason",
  "shippedAt",
] as const;

const K8_SYSTEM_STAGE_TO_UI: Record<string, string> = {
  sys_new: "new",
  sys_paid: "paid",
  sys_shipped: "shipped",
  sys_return: "return",
  sys_refused: "refused",
};

export function mapK8AppealStageKey(stageKey: string): string {
  const hit = K8_SYSTEM_STAGE_TO_UI[stageKey];
  if (hit) return hit;
  if (stageKey.startsWith("sys_")) return stageKey.slice(4);
  return stageKey;
}

export type ObserverAppealsFetchErrorCode =
  | "BLOCKED_CONTRACT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NETWORK"
  | "SERVER"
  | "SCHEMA_UNAVAILABLE";

export type ObserverAppealsFetchQuery = {
  q?: string;
  period?: "all" | "30" | "90";
  sort?: "updated_desc" | "created_desc";
  limit?: number;
};

/** K2 actual list page (navigator @ 72193c78). */
export type K2ObserverAppealsListPage = {
  items: unknown[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  empty?: boolean;
  receivingPartners?: unknown;
  receivingBranches?: unknown;
};

export type ObserverPersonalMetaWithVersion = ObserverPersonalMeta & { version?: number };

export type ObserverAppealsFetchResult =
  | {
      ok: true;
      appeals: ObserverReferredAppeal[];
      partners: ObserverPartnerMeta[];
      personalMeta: Record<string, ObserverPersonalMeta>;
      overlayVersions: Record<string, number>;
      pageInfo: { total: number; loaded: number; hasMore: boolean };
    }
  | {
      ok: false;
      code: ObserverAppealsFetchErrorCode;
      message: string;
      retryable: boolean;
      blockerId?: string;
      missingRoutes?: string[];
      httpStatus?: number;
    };

type ParsedListBundle = {
  appeals: ObserverReferredAppeal[];
  partners: ObserverPartnerMeta[];
  personalMeta: Record<string, ObserverPersonalMeta>;
  overlayVersions: Record<string, number>;
};

const DEFAULT_PAGE_LIMIT = 100;
const MAX_LIST_PAGES = 50;

function referredBlocker() {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-OBSERVER-REFERRED");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseK8AppealRow(row: Record<string, unknown>): ObserverReferredAppeal | null {
  const id = typeof row.id === "string" ? row.id : "";
  const clientName =
    typeof row.clientDisplayName === "string"
      ? row.clientDisplayName
      : typeof row.clientName === "string"
        ? row.clientName
        : "";
  const receivingPartnerId =
    typeof row.receivingBranchId === "string"
      ? row.receivingBranchId
      : typeof row.receivingPartnerId === "string"
        ? row.receivingPartnerId
        : "";
  const referrerPartnerId =
    typeof row.referrerProUserId === "string"
      ? row.referrerProUserId
      : typeof row.referrerPartnerId === "string"
        ? row.referrerPartnerId
        : "";
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
  const stageRaw =
    typeof row.stageKey === "string" ? row.stageKey : typeof row.stageId === "string" ? row.stageId : "new";
  const stageId = mapK8AppealStageKey(stageRaw);
  const referralAt =
    typeof row.referralAt === "string"
      ? row.referralAt
      : typeof row.createdAt === "string"
        ? row.createdAt
        : row.referralAt === null
          ? null
          : undefined;

  const sessionReferrer = referrerPartnerId || "session-viewer";
  if (!id || !clientName || !receivingPartnerId || !updatedAt) {
    return null;
  }

  return {
    id,
    clientName,
    interest: typeof row.interest === "string" ? row.interest : row.interest === null ? null : undefined,
    certificateId:
      typeof row.certificateId === "string"
        ? row.certificateId
        : row.certificateId === null
          ? null
          : undefined,
    receivingPartnerId,
    /** K2 list omits referrer on row; viewer scope is session (referrer-only GET). */
    referrerPartnerId: sessionReferrer,
    updatedAt,
    referralAt,
    stageId,
  };
}

function parsePartnerRow(row: Record<string, unknown>): ObserverPartnerMeta | null {
  const id =
    typeof row.branchId === "string"
      ? row.branchId
      : typeof row.receivingBranchId === "string"
        ? row.receivingBranchId
        : typeof row.id === "string"
          ? row.id
          : "";
  const name =
    typeof row.displayName === "string"
      ? row.displayName
      : typeof row.name === "string"
        ? row.name
        : "";
  if (!id || !name) return null;
  return {
    id,
    name,
    city: typeof row.city === "string" ? row.city : row.city === null ? null : undefined,
    category:
      typeof row.category === "string"
        ? row.category
        : typeof row.storeCategoryLabel === "string"
          ? row.storeCategoryLabel
          : row.category === null
            ? null
            : undefined,
  };
}

function mergePartners(
  partners: Map<string, ObserverPartnerMeta>,
  rows: unknown[],
  fromItems = false,
): void {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (fromItems) {
      const branch = row.receivingBranch;
      if (isRecord(branch)) {
        const mapped = parsePartnerRow(branch);
        if (mapped) partners.set(mapped.id, mapped);
      }
      continue;
    }
    const mapped = parsePartnerRow(row);
    if (mapped) partners.set(mapped.id, mapped);
  }
}

function extractOverlayFromItem(
  row: Record<string, unknown>,
  personalMeta: Record<string, ObserverPersonalMeta>,
  overlayVersions: Record<string, number>,
): void {
  const appealId = typeof row.id === "string" ? row.id : "";
  if (!appealId) return;
  const overlay = row.personalOverlay ?? row.personalMeta;
  if (!isRecord(overlay)) return;
  mergePersonalEntry(personalMeta, appealId, overlay);
  if (typeof overlay.version === "number") {
    overlayVersions[appealId] = overlay.version;
  }
}

function parseBucket(raw: unknown): ObserverPersonalMeta["bucket"] | undefined {
  if (raw === "active" || raw === "archived" || raw === "trash") return raw;
  return undefined;
}

function mergePersonalEntry(
  out: Record<string, ObserverPersonalMeta>,
  appealId: string,
  value: Record<string, unknown>,
  overlayVersions?: Record<string, number>,
): void {
  const alias =
    typeof value.alias === "string" ? value.alias : value.alias === null ? undefined : undefined;
  const tag = typeof value.tag === "string" ? value.tag : value.tag === null ? undefined : undefined;
  const note = typeof value.note === "string" ? value.note : value.note === null ? undefined : undefined;
  out[appealId] = {
    alias,
    tag,
    note,
    bucket: parseBucket(value.bucket),
  };
  if (overlayVersions && typeof value.version === "number") {
    overlayVersions[appealId] = value.version;
  }
}

function parsePersonalMeta(
  record: unknown,
  overlays: unknown,
  overlayVersions: Record<string, number>,
): Record<string, ObserverPersonalMeta> {
  const out: Record<string, ObserverPersonalMeta> = {};
  if (isRecord(record)) {
    for (const [appealId, value] of Object.entries(record)) {
      if (!isRecord(value)) continue;
      mergePersonalEntry(out, appealId, value, overlayVersions);
    }
  }
  if (Array.isArray(overlays)) {
    for (const row of overlays) {
      if (!isRecord(row)) continue;
      const appealId = typeof row.appealId === "string" ? row.appealId : "";
      if (!appealId) continue;
      mergePersonalEntry(out, appealId, row, overlayVersions);
    }
  }
  return out;
}

function parseListPayload(payload: unknown): ParsedListBundle | { error: string } {
  if (!isRecord(payload)) {
    return { error: "Некорректный ответ списка направлений." };
  }

  const appeals: ObserverReferredAppeal[] = [];
  const partners = new Map<string, ObserverPartnerMeta>();
  const personalMeta: Record<string, ObserverPersonalMeta> = {};
  const overlayVersions: Record<string, number> = {};

  const itemRows = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.appeals)
      ? payload.appeals
      : null;

  if (!itemRows) {
    return { error: "Отсутствует items[] в ответе K2." };
  }

  for (const row of itemRows) {
    if (!isRecord(row)) continue;
    const mapped = parseK8AppealRow(row);
    if (mapped) appeals.push(mapped);
    extractOverlayFromItem(row, personalMeta, overlayVersions);
  }

  if (Array.isArray(payload.receivingPartners)) {
    mergePartners(partners, payload.receivingPartners);
  }
  if (Array.isArray(payload.receivingBranches)) {
    mergePartners(partners, payload.receivingBranches);
  }
  if (Array.isArray(payload.partners)) {
    mergePartners(partners, payload.partners);
  }
  mergePartners(partners, itemRows, true);

  Object.assign(
    personalMeta,
    parsePersonalMeta(payload.personalMeta, payload.personalOverlays, overlayVersions),
  );

  const total = typeof payload.total === "number" ? payload.total : appeals.length;
  const empty = payload.empty === true;

  if (total > 0 && appeals.length > 0 && partners.size === 0) {
    return {
      error:
        "Ответ K2 содержит обращения без метаданных филиала (ожидается receivingPartners или receivingBranch).",
    };
  }

  if (total > 0 && appeals.length === 0) {
    return { error: "Ответ K2: total>0, но items пуст." };
  }

  if (!empty && appeals.length === 0 && total === 0) {
    return {
      appeals: [],
      partners: [],
      personalMeta: {},
      overlayVersions: {},
    };
  }

  return {
    appeals,
    partners: [...partners.values()],
    personalMeta,
    overlayVersions,
  };
}

function listQueryString(query: ObserverAppealsFetchQuery, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (query.q) params.set("q", query.q);
  if (query.period && query.period !== "all") params.set("period", query.period);
  if (query.sort) params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function proxyPathBlocked(error: RemcardApiError): boolean {
  const fromBody = error.body?.error?.trim() ?? "";
  const text = `${fromBody} ${error.message}`.toLowerCase();
  return text.includes("path not allowed") || text.includes("invalid path");
}

function blockedContractResult(): ObserverAppealsFetchResult {
  const blocker = referredBlocker();
  return {
    ok: false,
    code: "BLOCKED_CONTRACT",
    message: blocker?.summary ?? "Нет контракта для списка направленных клиентов.",
    retryable: false,
    blockerId: blocker?.id ?? "BLK-OBSERVER-REFERRED",
    missingRoutes: blocker?.missingApi ?? [],
  };
}

function mapFetchError(error: unknown): ObserverAppealsFetchResult {
  if (!(error instanceof RemcardApiError)) {
    return {
      ok: false,
      code: "NETWORK",
      message: "Сетевая ошибка при загрузке направлений.",
      retryable: true,
    };
  }

  if (error.status === 0) {
    return {
      ok: false,
      code: "NETWORK",
      message: error.message || "Сетевая ошибка",
      retryable: true,
      httpStatus: 0,
    };
  }

  if (error.status === 401) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: error.message || "Требуется вход в кабинет.",
      retryable: false,
      httpStatus: 401,
    };
  }

  if (error.status === 403) {
    if (proxyPathBlocked(error)) {
      return blockedContractResult();
    }
    const code = error.body?.code;
    return {
      ok: false,
      code: "FORBIDDEN",
      message:
        error.message ||
        (code ? `Нет доступа (${code})` : "Нет доступа к списку направлений."),
      retryable: false,
      httpStatus: 403,
    };
  }

  if (error.status === 404) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: error.message || "Список направлений не найден.",
      retryable: true,
      httpStatus: 404,
    };
  }

  if (error.status === 503) {
    const code = error.body?.code;
    if (code === "OBSERVER_APPEALS_SCHEMA_UNAVAILABLE" || code === "PERSISTENCE_UNAVAILABLE") {
      return {
        ok: false,
        code: "SCHEMA_UNAVAILABLE",
        message: error.message || "Хранилище направлений ещё не развёрнуто.",
        retryable: false,
        httpStatus: 503,
      };
    }
  }

  if (error.status >= 500) {
    return {
      ok: false,
      code: "SERVER",
      message: error.message || "Ошибка сервера при загрузке.",
      retryable: true,
      httpStatus: error.status,
    };
  }

  return {
    ok: false,
    code: "SERVER",
    message: error.message || `Ошибка загрузки (${error.status})`,
    retryable: false,
    httpStatus: error.status,
  };
}

/**
 * Production load adapter for observer referred appeals (+ optional personal overlay).
 * Uses BFF proxy; surfaces BLOCKED_CONTRACT until allowlist and origin exist.
 */
export async function fetchObserverReferredAppeals(
  options: {
    signal?: AbortSignal;
    query?: ObserverAppealsFetchQuery;
    /** When true (default), follow K2 hasMore until all pages loaded or MAX_LIST_PAGES. */
    fetchAllPages?: boolean;
  } = {},
): Promise<ObserverAppealsFetchResult> {
  const limit = Math.min(options.query?.limit ?? DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_LIMIT);
  const fetchAllPages = options.fetchAllPages !== false;

  try {
    const allAppeals: ObserverReferredAppeal[] = [];
    const partners = new Map<string, ObserverPartnerMeta>();
    const personalMeta: Record<string, ObserverPersonalMeta> = {};
    const overlayVersions: Record<string, number> = {};

    let page = 1;
    let total = 0;
    let hasMore = true;

    while (page <= MAX_LIST_PAGES) {
      const path = `${OBSERVER_REFERRED_APPEALS_LIST_PATH}${listQueryString(options.query ?? {}, page, limit)}`;
      const payload = await remcardFetch<K2ObserverAppealsListPage | Record<string, unknown>>(path, {
        method: "GET",
        signal: options.signal,
      });

      const parsed = parseListPayload(payload);
      if ("error" in parsed) {
        return {
          ok: false,
          code: "SERVER",
          message: parsed.error,
          retryable: true,
        };
      }

      for (const appeal of parsed.appeals) {
        allAppeals.push(appeal);
      }
      for (const partner of parsed.partners) {
        partners.set(partner.id, partner);
      }
      Object.assign(personalMeta, parsed.personalMeta);
      Object.assign(overlayVersions, parsed.overlayVersions);

      if (isRecord(payload)) {
        total = typeof payload.total === "number" ? payload.total : allAppeals.length;
        hasMore =
          typeof payload.hasMore === "boolean"
            ? payload.hasMore
            : page * limit < total;
      } else {
        total = allAppeals.length;
        hasMore = false;
      }

      if (!fetchAllPages || !hasMore) break;
      page += 1;
    }

    if (hasMore && fetchAllPages) {
      return {
        ok: false,
        code: "SERVER",
        message: `Слишком много страниц направлений (>${MAX_LIST_PAGES}). Уточните фильтры.`,
        retryable: false,
      };
    }

    return {
      ok: true,
      appeals: allAppeals,
      partners: [...partners.values()],
      personalMeta,
      overlayVersions,
      pageInfo: { total, loaded: allAppeals.length, hasMore },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return mapFetchError(error);
  }
}

/** @deprecated Use `ObserverAppealsFetchResult`; kept for contract inventory tests. */
export type ObserverAppealsLoadResult = ObserverAppealsFetchResult;
