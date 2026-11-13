import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import type {
  ObserverPartnerMeta,
  ObserverPersonalMeta,
  ObserverReferredAppeal,
} from "./types";

/** Agreed list route (P2 inventory / BFF proxy when allowlisted). */
export const OBSERVER_REFERRED_APPEALS_LIST_PATH = "/api/pro/referred-appeals";

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
};

function referredBlocker() {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-OBSERVER-REFERRED");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAppeals(raw: unknown): ObserverReferredAppeal[] | null {
  if (!Array.isArray(raw)) return null;
  const appeals: ObserverReferredAppeal[] = [];
  for (const row of raw) {
    if (!isRecord(row)) return null;
    const id = typeof row.id === "string" ? row.id : "";
    const clientName = typeof row.clientName === "string" ? row.clientName : "";
    const receivingPartnerId =
      typeof row.receivingPartnerId === "string" ? row.receivingPartnerId : "";
    const referrerPartnerId =
      typeof row.referrerPartnerId === "string" ? row.referrerPartnerId : "";
    const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
    const stageId = typeof row.stageId === "string" ? row.stageId : "new";
    if (!id || !clientName || !receivingPartnerId || !referrerPartnerId || !updatedAt) {
      return null;
    }
    appeals.push({
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
      referrerPartnerId,
      updatedAt,
      referralAt:
        typeof row.referralAt === "string"
          ? row.referralAt
          : row.referralAt === null
            ? null
            : undefined,
      stageId,
    });
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

function parsePersonalMeta(raw: unknown): Record<string, ObserverPersonalMeta> {
  if (!isRecord(raw)) return {};
  const out: Record<string, ObserverPersonalMeta> = {};
  for (const [appealId, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    out[appealId] = {
      alias: typeof value.alias === "string" ? value.alias : undefined,
      tag: typeof value.tag === "string" ? value.tag : undefined,
      note: typeof value.note === "string" ? value.note : undefined,
      bucket: parseBucket(value.bucket),
    };
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
      personalMeta: parsePersonalMeta(payload.personalMeta),
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
