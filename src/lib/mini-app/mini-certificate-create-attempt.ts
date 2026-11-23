import { RemcardApiError } from "@/lib/api-client";
import type { CreateCertificateBody } from "@/lib/certificate-types";
import { hashAgentCreatePayload } from "@/lib/agent-r03/create-idempotency";
import type { MiniAppPlatform } from "@/lib/mini-app/types";

export const MINI_CERTIFICATE_CREATE_ATTEMPT_VERSION = 1 as const;

export type MiniCertificateCreateAttemptScope = {
  actorUserId: string;
  platform: MiniAppPlatform;
  branchId: string | null;
};

export type MiniCertificateCreateAttemptBody = CreateCertificateBody & {
  agentClientId?: string | null;
  branchId?: string;
};

export type MiniCertificateCreateAttemptStatus = "in_flight" | "unknown";

export type MiniCertificateCreateAttemptRecord = {
  version: typeof MINI_CERTIFICATE_CREATE_ATTEMPT_VERSION;
  actorUserId: string;
  platform: MiniAppPlatform;
  branchId: string | null;
  idempotencyKey: string;
  payloadHash: string;
  body: MiniCertificateCreateAttemptBody;
  status: MiniCertificateCreateAttemptStatus;
  savedAt: number;
};

export type BeginMiniCertificateAttemptResult =
  | { ok: true; record: MiniCertificateCreateAttemptRecord }
  | {
      ok: false;
      reason: "storage" | "blocked" | "body_mismatch" | "use_retry";
      existing?: MiniCertificateCreateAttemptRecord;
    };

export type PrepareMiniCertificateRetryResult =
  | { ok: true; record: MiniCertificateCreateAttemptRecord }
  | { ok: false; reason: "none" | "foreign_scope" };

export type MiniCertificateCreatePostOutcome =
  | { kind: "success" }
  | { kind: "uncertain" }
  | { kind: "unknown_persist"; message?: string }
  | { kind: "validation_failed"; message: string }
  | { kind: "conflict"; message?: string };

export const MINI_CERT_ATTEMPT_STORAGE_FAILED =
  "Не удалось сохранить попытку выпуска. Разрешите хранение данных в сессии или откройте мини-приложение без приватного режима.";

export const MINI_CERT_ATTEMPT_BODY_MISMATCH =
  "Условия на экране не совпадают с незавершённой попыткой. Сначала нажмите «Проверить результат» или дождитесь ответа PROF.";

export const MINI_CERT_ATTEMPT_USE_RETRY =
  "Выпуск мог сохраниться на сервере. Нажмите «Проверить результат» — ключ и условия не изменятся.";

function scopeStorageKey(scope: MiniCertificateCreateAttemptScope): string {
  const branch = scope.branchId?.trim() || "_";
  return `rc-mini-cert-attempt-v${MINI_CERTIFICATE_CREATE_ATTEMPT_VERSION}:${scope.actorUserId}:${scope.platform}:${branch}`;
}

function sessionStorageSafe(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    void sessionStorage.length;
    return sessionStorage;
  } catch {
    return null;
  }
}

function scopeMatches(
  record: MiniCertificateCreateAttemptRecord,
  scope: MiniCertificateCreateAttemptScope,
): boolean {
  return (
    record.actorUserId === scope.actorUserId &&
    record.platform === scope.platform &&
    (record.branchId ?? null) === (scope.branchId ?? null)
  );
}

function readRaw(scope: MiniCertificateCreateAttemptScope): MiniCertificateCreateAttemptRecord | null {
  const storage = sessionStorageSafe();
  if (!storage) return null;
  try {
    const raw = storage.getItem(scopeStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MiniCertificateCreateAttemptRecord;
    if (parsed?.version !== MINI_CERTIFICATE_CREATE_ATTEMPT_VERSION) return null;
    if (
      typeof parsed.actorUserId !== "string" ||
      typeof parsed.idempotencyKey !== "string" ||
      typeof parsed.payloadHash !== "string" ||
      !parsed.body ||
      !Array.isArray(parsed.body.partners)
    ) {
      return null;
    }
    if (!scopeMatches(parsed, scope)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekMiniCertificateCreateAttempt(
  scope: MiniCertificateCreateAttemptScope,
): MiniCertificateCreateAttemptRecord | null {
  return readRaw(scope);
}

export function loadMiniCertificateCreateAttempt(
  scope: MiniCertificateCreateAttemptScope,
): MiniCertificateCreateAttemptRecord | null {
  const record = readRaw(scope);
  if (!record) return null;
  if (record.status === "in_flight") {
    return { ...record, status: "unknown" };
  }
  return record;
}

export function saveMiniCertificateCreateAttempt(record: MiniCertificateCreateAttemptRecord): boolean {
  const storage = sessionStorageSafe();
  if (!storage) return false;
  try {
    storage.setItem(scopeStorageKey(record), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearMiniCertificateCreateAttempt(scope: MiniCertificateCreateAttemptScope): void {
  const storage = sessionStorageSafe();
  if (!storage) return;
  storage.removeItem(scopeStorageKey(scope));
}

export function miniCertificateAttemptPayloadHash(body: MiniCertificateCreateAttemptBody): string {
  return hashAgentCreatePayload(body);
}

export function isMiniCertificateCreateAttemptLocked(
  record: MiniCertificateCreateAttemptRecord | null,
): boolean {
  return record?.status === "unknown" || record?.status === "in_flight";
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is unavailable");
}

/** Persist a new in-flight attempt before the POST leaves the client. */
export function beginMiniCertificateCreateAttempt(params: {
  scope: MiniCertificateCreateAttemptScope;
  body: MiniCertificateCreateAttemptBody;
}): BeginMiniCertificateAttemptResult {
  const payloadHash = miniCertificateAttemptPayloadHash(params.body);
  const existing = readRaw(params.scope);
  if (existing) {
    const effectiveStatus =
      existing.status === "in_flight" ? ("unknown" as const) : existing.status;
    if (effectiveStatus === "unknown") {
      if (existing.payloadHash !== payloadHash) {
        return { ok: false, reason: "body_mismatch", existing };
      }
      return { ok: false, reason: "use_retry", existing };
    }
  }

  const record: MiniCertificateCreateAttemptRecord = {
    version: MINI_CERTIFICATE_CREATE_ATTEMPT_VERSION,
    actorUserId: params.scope.actorUserId,
    platform: params.scope.platform,
    branchId: params.scope.branchId,
    idempotencyKey: generateIdempotencyKey(),
    payloadHash,
    body: params.body,
    status: "in_flight",
    savedAt: Date.now(),
  };

  if (!saveMiniCertificateCreateAttempt(record)) {
    return { ok: false, reason: "storage" };
  }
  return { ok: true, record };
}

export function prepareMiniCertificateCreateRetry(
  scope: MiniCertificateCreateAttemptScope,
): PrepareMiniCertificateRetryResult {
  const record = loadMiniCertificateCreateAttempt(scope);
  if (!record) {
    return { ok: false, reason: "none" };
  }
  if (!scopeMatches(record, scope)) {
    return { ok: false, reason: "foreign_scope" };
  }
  return { ok: true, record };
}

export function markMiniCertificateCreateAttemptInFlight(
  scope: MiniCertificateCreateAttemptScope,
  idempotencyKey: string,
): MiniCertificateCreateAttemptRecord | null {
  const record = readRaw(scope);
  if (!record || record.idempotencyKey !== idempotencyKey) return null;
  const next = { ...record, status: "in_flight" as const };
  saveMiniCertificateCreateAttempt(next);
  return next;
}

export function markMiniCertificateCreateAttemptUnknown(
  scope: MiniCertificateCreateAttemptScope,
  idempotencyKey: string,
): MiniCertificateCreateAttemptRecord | null {
  const record = readRaw(scope);
  if (!record || record.idempotencyKey !== idempotencyKey) return null;
  const next = { ...record, status: "unknown" as const };
  saveMiniCertificateCreateAttempt(next);
  return next;
}

export function classifyMiniCertificateCreateFailure(
  error: unknown,
  wasRetry: boolean,
): MiniCertificateCreatePostOutcome {
  if (!(error instanceof RemcardApiError)) {
    return wasRetry ? { kind: "unknown_persist" } : { kind: "uncertain" };
  }
  if (error.status === 0) {
    return wasRetry ? { kind: "unknown_persist", message: error.message } : { kind: "uncertain" };
  }
  if (error.status === 409) {
    return wasRetry
      ? { kind: "unknown_persist", message: error.message }
      : { kind: "conflict", message: error.message };
  }
  if (error.status >= 500 || (error.status >= 502 && error.status <= 504)) {
    return wasRetry ? { kind: "unknown_persist", message: error.message } : { kind: "uncertain" };
  }
  if (error.status === 401 || error.status === 403) {
    return { kind: "validation_failed", message: error.message };
  }
  if (error.status === 422) {
    return { kind: "validation_failed", message: error.message };
  }
  return { kind: "validation_failed", message: error.message };
}