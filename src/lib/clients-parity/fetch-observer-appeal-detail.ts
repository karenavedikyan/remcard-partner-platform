import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  resolveClientAppealStageDisplayLabel,
  trimTrustedClientsDisplayString,
} from "./client-appeal-display";
import { formatAppealHistoryTimelineText } from "./appeal-history-stage-text";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import {
  mapK8AppealStageKey,
  OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS,
  resolveReceivingPrincipalId,
  wireCertificateId,
  partnerScopeFromWire,
} from "./fetch-observer-appeals";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "./types";

export const observerReferredAppealDetailPath = (appealId: string) =>
  `/api/pro/referred-appeals/${encodeURIComponent(appealId)}`;

/** K2 public referrer timeline @ c49d71dc — `{ at, text }` only. */
export type ObserverPublicTimelineEvent = {
  at: string;
  text: string;
};

export type ObserverAppealDetailPurchase = {
  amountKopecks: number;
  note: string | null;
};

export type ObserverAppealDetailFetchErrorCode =
  | "BLOCKED_CONTRACT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NETWORK"
  | "SERVER"
  | "SCHEMA_UNAVAILABLE";

export type ObserverAppealDetailFetchResult =
  | {
      ok: true;
      appeal: ObserverReferredAppeal;
      partner: ObserverPartnerMeta;
      timeline: ObserverPublicTimelineEvent[];
      purchase: ObserverAppealDetailPurchase | null;
    }
  | {
      ok: false;
      code: ObserverAppealDetailFetchErrorCode;
      message: string;
      retryable: boolean;
      httpStatus?: number;
    };

function referredDetailBlocker() {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-OBSERVER-REFERRED");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAppealRow(row: Record<string, unknown>): ObserverReferredAppeal | null {
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
        : null;
  const scope = partnerScopeFromWire(row);
  const stageLabel = resolveClientAppealStageDisplayLabel({
    stageKey: stageId,
    trustedStageLabel: trimTrustedClientsDisplayString(row.stageLabel),
  });
  const referrerDisplayName = trimTrustedClientsDisplayString(row.referrerDisplayName);

  if (!id || !clientName || !receivingPartnerId || !updatedAt) return null;

  return {
    id,
    clientName,
    interest: typeof row.interest === "string" ? row.interest : row.interest === null ? null : undefined,
    certificateId: wireCertificateId(row.certificateId),
    receivingPartnerId,
    receivingOrganizationId: scope.receivingOrganizationId,
    receivingBranchId: scope.receivingBranchId,
    referrerPartnerId: referrerPartnerId || "session-viewer",
    updatedAt,
    referralAt,
    stageId,
    stageLabel,
    referrerDisplayName: referrerDisplayName ?? null,
  };
}

function parseReceivingPartner(row: unknown): ObserverPartnerMeta | null {
  if (!isRecord(row)) return null;
  const id = resolveReceivingPrincipalId(row);
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
        : row.category === null
          ? null
          : undefined,
    receivingOrganizationId: scope.receivingOrganizationId,
    receivingBranchId: scope.receivingBranchId,
  };
}

function parseTimeline(rows: unknown): ObserverPublicTimelineEvent[] {
  if (!Array.isArray(rows)) return [];
  const out: ObserverPublicTimelineEvent[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const at = typeof row.at === "string" ? row.at : "";
    const text = typeof row.text === "string" ? row.text : "";
    if (!at || !text) continue;
    for (const forbidden of OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS) {
      if (forbidden in row) {
        /* strip — should not appear on public timeline */
      }
    }
    out.push({ at, text: formatAppealHistoryTimelineText(text) });
  }
  return out;
}

function parsePurchase(value: unknown): ObserverAppealDetailPurchase | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  const amountKopecks =
    typeof value.amountKopecks === "number"
      ? value.amountKopecks
      : typeof value.amountKopecks === "string"
        ? Number(value.amountKopecks)
        : NaN;
  if (!Number.isFinite(amountKopecks)) return null;
  return {
    amountKopecks,
    note: typeof value.note === "string" ? value.note : value.note === null ? null : null,
  };
}

function proxyPathBlocked(error: RemcardApiError): boolean {
  const fromBody = error.body?.error?.trim() ?? "";
  const text = `${fromBody} ${error.message}`.toLowerCase();
  return text.includes("path not allowed") || text.includes("invalid path");
}

function mapFetchError(error: unknown): ObserverAppealDetailFetchResult {
  if (!(error instanceof RemcardApiError)) {
    return {
      ok: false,
      code: "NETWORK",
      message: "Сетевая ошибка при загрузке направления.",
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
      const blocker = referredDetailBlocker();
      return {
        ok: false,
        code: "BLOCKED_CONTRACT",
        message: blocker?.summary ?? "Маршрут детали недоступен через прокси.",
        retryable: false,
        httpStatus: 403,
      };
    }
    return {
      ok: false,
      code: "FORBIDDEN",
      message: error.message || "Нет доступа к направлению.",
      retryable: false,
      httpStatus: 403,
    };
  }
  if (error.status === 404) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: error.message || "Направление не найдено.",
      retryable: false,
      httpStatus: 404,
    };
  }
  if (error.status === 503) {
    return {
      ok: false,
      code: "SCHEMA_UNAVAILABLE",
      message: error.message || "Хранилище направлений ещё не развёрнуто.",
      retryable: false,
      httpStatus: 503,
    };
  }
  if (error.status >= 500) {
    return {
      ok: false,
      code: "SERVER",
      message: error.message || "Ошибка сервера.",
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

export async function fetchObserverReferredAppealDetail(
  appealId: string,
  options: { signal?: AbortSignal } = {},
): Promise<ObserverAppealDetailFetchResult> {
  const id = appealId.trim();
  if (!id) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Не указан идентификатор направления.",
      retryable: false,
    };
  }

  try {
    const payload = await remcardFetch<Record<string, unknown>>(observerReferredAppealDetailPath(id), {
      method: "GET",
      signal: options.signal,
    });

    const appealWire = isRecord(payload.appeal) ? payload.appeal : null;
    if (!appealWire) {
      return {
        ok: false,
        code: "SERVER",
        message: "Некорректный ответ детали направления.",
        retryable: true,
      };
    }

    const appeal = parseAppealRow(appealWire);
    if (!appeal) {
      return {
        ok: false,
        code: "SERVER",
        message: "Не удалось разобрать направление.",
        retryable: true,
      };
    }

    const partnerFromWire = parseReceivingPartner(payload.receivingPartner);
    const partner: ObserverPartnerMeta = partnerFromWire ?? {
      id: appeal.receivingPartnerId,
      name: "—",
      receivingOrganizationId: appeal.receivingOrganizationId ?? null,
      receivingBranchId: appeal.receivingBranchId ?? null,
    };

    const timeline = parseTimeline(payload.timeline);
    const purchase = parsePurchase(payload.purchase);

    return { ok: true, appeal, partner, timeline, purchase };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return mapFetchError(error);
  }
}
