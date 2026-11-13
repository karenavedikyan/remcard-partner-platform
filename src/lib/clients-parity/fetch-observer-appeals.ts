import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import type {
  ObserverPartnerMeta,
  ObserverPersonalMeta,
  ObserverReferredAppeal,
} from "./types";

/**
 * Frozen wire (Root SOURCE-PREP): K2 `c49d71dce`, K8 dto `8f4d336ad`, identity `receivingPartnerUserId`.
 * K8 canonical source (candidate, not release):
 * `karenavedikyan/remcard-navigator` @ `fc33b4fae859fb692757807c3b27696b66d57558`
 * — `src/lib/clientAppeals/contract.ts`, `HANDOFF.md`.
 * P2 BFF forwards K2 observer GET; this adapter maps wire → UI view-model only.
 *
 * Identity (Root 2026-11-13): UI `receivingPartnerId` = trusted **receiving principal User.id**
 * (`receivingPartnerUserId` on wire). `receivingBranchId` is optional scope metadata only.
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

/** P2 @ 457a417c: preserve canonical K8 `sys_*` system stage ids in UI state. */
export const OBSERVER_K8_SYSTEM_STAGE_KEYS = [
  "sys_new",
  "sys_paid",
  "sys_shipped",
  "sys_return",
  "sys_refused",
] as const;

export function mapK8AppealStageKey(stageKey: string): string {
  if ((OBSERVER_K8_SYSTEM_STAGE_KEYS as readonly string[]).includes(stageKey)) {
    return stageKey;
  }
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

/** K2 actual list page (navigator @ 3c6ccc19; legacy `items` accepted). */
export type K2ObserverAppealsListPage = {
  appeals: unknown[];
  partners: unknown[];
  personalMeta?: Record<string, unknown | null>;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  empty?: boolean;
  /** @deprecated transition — prefer `appeals`. */
  items?: unknown[];
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

/** Wire optional nullable string (solo specialist: org/branch absent → null). */
function wireNullableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return null;
}

/** P2 @ 120d9a4a: UI `certificateId` is string; null/absent on wire → "". */
function wireCertificateId(value: unknown): string {
  if (typeof value === "string") return value;
  return "";
}

function partnerScopeFromWire(row: Record<string, unknown>): Pick<
  ObserverPartnerMeta,
  "receivingOrganizationId" | "receivingBranchId"
> {
  return {
    receivingOrganizationId: wireNullableString(row.receivingOrganizationId),
    receivingBranchId: wireNullableString(row.receivingBranchId),
  };
}

/** Canonical receiving card key — User.id first; branch ids are transition-only fallback. */
export function resolveReceivingPrincipalId(row: Record<string, unknown>): string {
  if (typeof row.receivingPartnerUserId === "string" && row.receivingPartnerUserId) {
    return row.receivingPartnerUserId;
  }
  if (typeof row.receivingPartnerId === "string" && row.receivingPartnerId) {
    return row.receivingPartnerId;
  }
  if (typeof row.receivingBranchId === "string" && row.receivingBranchId) {
    return row.receivingBranchId;
  }
  return "";
}

function resolvePartnerMetaId(row: Record<string, unknown>): string {
  if (typeof row.receivingPartnerUserId === "string" && row.receivingPartnerUserId) {
    return row.receivingPartnerUserId;
  }
  if (typeof row.receivingPartnerId === "string" && row.receivingPartnerId) {
    return row.receivingPartnerId;
  }
  if (typeof row.userId === "string" && row.userId) {
    return row.userId;
  }
  if (typeof row.branchId === "string" && row.branchId) {
    return row.branchId;
  }
  if (typeof row.receivingBranchId === "string" && row.receivingBranchId) {
    return row.receivingBranchId;
  }
  if (typeof row.id === "string" && row.id) {
    return row.id;
  }
  return "";
}

function parseK8AppealRow(row: Record<string, unknown>): ObserverReferredAppeal | null {
  const id = typeof row.id === "string" ? row.id : "";
  const clientName =
    typeof row.clientDisplayName === "string"
      ? row.clientDisplayName
      : typeof row.clientName === "string"
        ? row.clientName
        : "";
  const receivingPartnerId = resolveReceivingPrincipalId(row);
  const referrerPartnerId =
    typeof row.referrerProUserId === "string"
      ? row.referrerProUserId
      : typeof row.referrerPartnerId === "string"
        ? row.referrerPartnerId
        : "";
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
  const stageRaw =
    typeof row.stageKey === "string"
      ? row.stageKey
      : typeof row.stageId === "string"
        ? row.stageId
        : "sys_new";
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

  const scope = partnerScopeFromWire(row);

  return {
    id,
    clientName,
    interest: typeof row.interest === "string" ? row.interest : row.interest === null ? null : undefined,
    certificateId: wireCertificateId(row.certificateId),
    receivingPartnerId,
    receivingOrganizationId: scope.receivingOrganizationId,
    receivingBranchId: scope.receivingBranchId,
    /** K2 list omits referrer on row; viewer scope is session (referrer-only GET). */
    referrerPartnerId: sessionReferrer,
    updatedAt,
    referralAt,
    stageId,
  };
}

function parsePartnerRow(row: Record<string, unknown>): ObserverPartnerMeta | null {
  const id = resolvePartnerMetaId(row);
  const name =
    typeof row.displayName === "string"
      ? row.displayName
      : typeof row.name === "string"
        ? row.name
        : "";
  if (!id || !name) return null;
  const scope = partnerScopeFromWire(row);
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
    receivingOrganizationId: scope.receivingOrganizationId,
    receivingBranchId: scope.receivingBranchId,
  };
}

function registerPartnerMeta(
  partners: Map<string, ObserverPartnerMeta>,
  principalId: string,
  meta: ObserverPartnerMeta,
): void {
  if (!principalId) return;
  partners.set(principalId, { ...meta, id: principalId });
}

function partnerMetaFromItemRow(row: Record<string, unknown>): ObserverPartnerMeta | null {
  const principalId = resolveReceivingPrincipalId(row);
  const embedded = row.receivingPartner;
  if (isRecord(embedded)) {
    const base = parsePartnerRow(embedded);
    if (base) return { ...base, id: principalId || base.id };
  }
  const branch = row.receivingBranch;
  if (isRecord(branch) && principalId) {
    const base = parsePartnerRow(branch);
    if (base) {
      const scope = partnerScopeFromWire(row);
      return {
        id: principalId,
        name: base.name,
        city: base.city,
        category: base.category,
        receivingOrganizationId: scope.receivingOrganizationId ?? base.receivingOrganizationId,
        receivingBranchId: scope.receivingBranchId ?? base.receivingBranchId,
      };
    }
  }
  if (principalId && typeof row.receivingPartnerDisplayName === "string") {
    const scope = partnerScopeFromWire(row);
    return {
      id: principalId,
      name: row.receivingPartnerDisplayName,
      city:
        typeof row.receivingPartnerCity === "string"
          ? row.receivingPartnerCity
          : row.receivingPartnerCity === null
            ? null
            : undefined,
      receivingOrganizationId: scope.receivingOrganizationId,
      receivingBranchId: scope.receivingBranchId,
    };
  }
  return null;
}

function mergePartners(
  partners: Map<string, ObserverPartnerMeta>,
  rows: unknown[],
  fromItems = false,
): void {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (fromItems) {
      const fromItem = partnerMetaFromItemRow(row);
      if (fromItem) {
        registerPartnerMeta(partners, fromItem.id, fromItem);
      }
      continue;
    }
    const mapped = parsePartnerRow(row);
    if (mapped) registerPartnerMeta(partners, mapped.id, mapped);
  }
}

function assertPartnerMetaForAppeals(
  appeals: ObserverReferredAppeal[],
  partners: Map<string, ObserverPartnerMeta>,
): string | null {
  for (const appeal of appeals) {
    const meta = partners.get(appeal.receivingPartnerId);
    if (!meta?.name) {
      return `Нет метаданных принимающего партнёра (receivingPartnerUserId=${appeal.receivingPartnerId}).`;
    }
  }
  return null;
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
      if (value === null || value === undefined) continue;
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

  const itemRows = Array.isArray(payload.appeals)
    ? payload.appeals
    : Array.isArray(payload.items)
      ? payload.items
      : null;

  if (!itemRows) {
    return { error: "Отсутствует appeals[] в ответе K2." };
  }

  for (const row of itemRows) {
    if (!isRecord(row)) continue;
    const mapped = parseK8AppealRow(row);
    if (mapped) appeals.push(mapped);
    extractOverlayFromItem(row, personalMeta, overlayVersions);
  }

  if (Array.isArray(payload.partners)) {
    mergePartners(partners, payload.partners);
  }
  if (Array.isArray(payload.receivingPartners)) {
    mergePartners(partners, payload.receivingPartners);
  }
  if (Array.isArray(payload.receivingBranches)) {
    mergePartners(partners, payload.receivingBranches);
  }
  mergePartners(partners, itemRows, true);

  if (isRecord(payload.personalMeta)) {
    for (const [appealId, value] of Object.entries(payload.personalMeta)) {
      if (value === null || value === undefined) continue;
      if (!isRecord(value)) continue;
      mergePersonalEntry(personalMeta, appealId, value, overlayVersions);
    }
  }
  Object.assign(
    personalMeta,
    parsePersonalMeta(undefined, payload.personalOverlays, overlayVersions),
  );

  const total = typeof payload.total === "number" ? payload.total : appeals.length;
  const empty = payload.empty === true;

  const missingMeta = assertPartnerMetaForAppeals(appeals, partners);
  if (total > 0 && appeals.length > 0 && missingMeta) {
    return { error: missingMeta };
  }

  if (total > 0 && appeals.length === 0) {
    return { error: "Ответ K2: total>0, но appeals пуст." };
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
