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
  | "SERVER";

export type ObserverAppealsFetchResult =
  | {
      ok: true;
      appeals: ObserverReferredAppeal[];
      partners: ObserverPartnerMeta[];
      personalMeta: Record<string, ObserverPersonalMeta>;
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

type ReferredAppealsApiBody = {
  appeals?: unknown;
  partners?: unknown;
  personalMeta?: unknown;
  /** K8 / K5 list overlay (record or rows). */
  personalOverlays?: unknown;
};

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

  if (!id || !clientName || !receivingPartnerId || !referrerPartnerId || !updatedAt) {
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
    /** Stores K8 `referrerProUserId` until P2 exposes explicit partner scope ids. */
    referrerPartnerId,
    updatedAt,
    referralAt,
    stageId,
  };
}

function parseAppeals(raw: unknown): ObserverReferredAppeal[] | null {
  if (!Array.isArray(raw)) return null;
  const appeals: ObserverReferredAppeal[] = [];
  for (const row of raw) {
    if (!isRecord(row)) return null;
    const mapped = parseK8AppealRow(row);
    if (!mapped) continue;
    appeals.push(mapped);
  }
  return appeals;
}

function parsePartners(raw: unknown): ObserverPartnerMeta[] | null {
  if (!Array.isArray(raw)) return null;
  const partners: ObserverPartnerMeta[] = [];
  for (const row of raw) {
    if (!isRecord(row)) return null;
    const id = typeof row.id === "string" ? row.id : "";
    const name = typeof row.name === "string" ? row.name : "";
    if (!id || !name) return null;
    partners.push({
      id,
      name,
      city: typeof row.city === "string" ? row.city : row.city === null ? null : undefined,
      category:
        typeof row.category === "string" ? row.category : row.category === null ? null : undefined,
    });
  }
  return partners;
}

function parseBucket(raw: unknown): ObserverPersonalMeta["bucket"] | undefined {
  if (raw === "active" || raw === "archived" || raw === "trash") return raw;
  return undefined;
}

function mergePersonalEntry(
  out: Record<string, ObserverPersonalMeta>,
  appealId: string,
  value: Record<string, unknown>,
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
}

function parsePersonalMeta(
  record: unknown,
  overlays: unknown,
): Record<string, ObserverPersonalMeta> {
  const out: Record<string, ObserverPersonalMeta> = {};
  if (isRecord(record)) {
    for (const [appealId, value] of Object.entries(record)) {
      if (!isRecord(value)) continue;
      mergePersonalEntry(out, appealId, value);
    }
  }
  if (Array.isArray(overlays)) {
    for (const row of overlays) {
      if (!isRecord(row)) continue;
      const appealId = typeof row.appealId === "string" ? row.appealId : "";
      if (!appealId) continue;
      mergePersonalEntry(out, appealId, row);
    }
  }
  return out;
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
    return {
      ok: false,
      code: "FORBIDDEN",
      message: error.message || "Нет доступа к списку направлений.",
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
  options: { signal?: AbortSignal } = {},
): Promise<ObserverAppealsFetchResult> {
  try {
    const payload = await remcardFetch<ReferredAppealsApiBody>(OBSERVER_REFERRED_APPEALS_LIST_PATH, {
      method: "GET",
      signal: options.signal,
    });

    const appeals = parseAppeals(payload.appeals);
    const partners = parsePartners(payload.partners);
    if (!appeals || !partners) {
      return {
        ok: false,
        code: "SERVER",
        message: "Некорректный ответ списка направлений.",
        retryable: true,
      };
    }

    return {
      ok: true,
      appeals,
      partners,
      personalMeta: parsePersonalMeta(payload.personalMeta, payload.personalOverlays),
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
