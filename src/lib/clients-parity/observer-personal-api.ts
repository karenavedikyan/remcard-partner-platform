/**
 * K5 — observer personal overlay client (referred-appeals only).
 * BFF: /api/remcard → P1 proxy. Never calls AgentClient CRUD.
 */
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ObserverPersonalBucket, ObserverPersonalMeta } from "@/lib/clients-parity/types";

export const OBSERVER_PERSONAL_META_ROUTE =
  "/api/pro/referred-appeals/:appealId/personal-meta" as const;
export const OBSERVER_PERSONAL_BATCH_ROUTE = "/api/pro/referred-appeals/personal-batch" as const;

export type PersonalMetaPatch = {
  alias?: string;
  tag?: string;
  note?: string;
  bucket?: ObserverPersonalBucket;
  /** Server stores previous bucket before trash (prototype beforeTrash). */
  clearTag?: boolean;
};

export type PersonalBatchOperation =
  | { op: "set-tag"; ids: string[]; tag: string }
  | { op: "set-bucket"; ids: string[]; bucket: ObserverPersonalBucket };

export type PersonalMetaFailure = {
  appealId: string;
  code: string;
  message: string;
};

export type PersonalMutationResult =
  | {
      ok: true;
      kind: "full";
      appliedIds: string[];
      metaById?: Record<string, ObserverPersonalMeta>;
    }
  | {
      ok: true;
      kind: "partial";
      appliedIds: string[];
      failed: PersonalMetaFailure[];
      metaById?: Record<string, ObserverPersonalMeta>;
    }
  | {
      ok: false;
      kind: "blocked_contract";
      blockerId: "BLK-OBSERVER-PERSONAL-PERSIST";
      message: string;
    }
  | {
      ok: false;
      kind: "error";
      message: string;
      status?: number;
      failed?: PersonalMetaFailure[];
      /** Preserve selection + draft; caller must not clear panel. */
      preserveUi: true;
    };

type PersonalMetaResponse = {
  ok?: boolean;
  meta?: ObserverPersonalMeta;
  appealId?: string;
};

type PersonalBatchResponse = {
  ok?: boolean;
  applied?: string[];
  failed?: PersonalMetaFailure[];
  metaById?: Record<string, ObserverPersonalMeta>;
};

function metaPath(appealId: string) {
  return `/api/pro/referred-appeals/${encodeURIComponent(appealId)}/personal-meta`;
}

export function isPersonalPersistProxyBlocked(error: unknown): boolean {
  if (!(error instanceof RemcardApiError)) return false;
  if (error.status === 404 || error.status === 403) return true;
  const code = error.body?.code ?? "";
  return (
    code === "PROXY_ROUTE_NOT_ALLOWED" ||
    code === "BLOCKED_CONTRACT" ||
    code === "NOT_IMPLEMENTED"
  );
}

function blockedContract(): PersonalMutationResult {
  return {
    ok: false,
    kind: "blocked_contract",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    message:
      "Маршруты personal-meta ещё не доступны через proxy. Ожидаются navigator backend и allowlist P1.",
  };
}

function normalizeBatch(raw: PersonalBatchResponse, fallbackIds: string[]): PersonalMutationResult {
  const applied = raw.applied ?? [];
  const failed = raw.failed ?? [];
  const metaById = raw.metaById;
  if (failed.length === 0) {
    return { ok: true, kind: "full", appliedIds: applied.length ? applied : fallbackIds, metaById };
  }
  if (applied.length === 0) {
    return {
      ok: false,
      kind: "error",
      message: "Ни одна запись не обновлена.",
      failed,
      preserveUi: true,
    };
  }
  return { ok: true, kind: "partial", appliedIds: applied, failed, metaById };
}

export async function patchObserverPersonalMeta(
  appealId: string,
  patch: PersonalMetaPatch,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  try {
    const body = await remcardFetch<PersonalMetaResponse>(metaPath(appealId), {
      method: "PATCH",
      body: patch,
      requireCsrf: true,
      signal,
    });
    if (!body?.meta) {
      return {
        ok: false,
        kind: "error",
        message: "Ответ сервера без meta.",
        preserveUi: true,
      };
    }
    return {
      ok: true,
      kind: "full",
      appliedIds: [appealId],
      metaById: { [appealId]: body.meta },
    };
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedContract();
    if (error instanceof RemcardApiError) {
      return {
        ok: false,
        kind: "error",
        message: error.message,
        status: error.status,
        preserveUi: true,
      };
    }
    throw error;
  }
}

export async function postObserverPersonalBatch(
  operation: PersonalBatchOperation,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  try {
    const body = await remcardFetch<PersonalBatchResponse>("/api/pro/referred-appeals/personal-batch", {
      method: "POST",
      body: operation,
      requireCsrf: true,
      signal,
    });
    return normalizeBatch(body, operation.ids);
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedContract();
    if (error instanceof RemcardApiError) {
      return {
        ok: false,
        kind: "error",
        message: error.message,
        status: error.status,
        preserveUi: true,
      };
    }
    throw error;
  }
}

/** Single-row save — maps edit panel draft (prototype single submit). */
export async function saveObserverPersonalSingle(
  appealId: string,
  draft: { alias: string; tag: string; note: string },
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return patchObserverPersonalMeta(
    appealId,
    {
      alias: draft.alias || undefined,
      tag: draft.tag,
      note: draft.note || undefined,
      clearTag: draft.tag.length === 0,
    },
    signal,
  );
}

/** Bulk tag only (prototype bulk edit). */
export async function saveObserverPersonalBulkTag(
  ids: string[],
  tag: string,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return postObserverPersonalBatch({ op: "set-tag", ids, tag }, signal);
}

export async function moveObserverPersonalBucket(
  ids: string[],
  bucket: ObserverPersonalBucket,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return postObserverPersonalBatch({ op: "set-bucket", ids, bucket }, signal);
}

export function personalMutationErrorMessage(result: PersonalMutationResult): string | null {
  if (result.ok) {
    if (result.kind === "partial") {
      return `Обновлено: ${result.appliedIds.length}, ошибок: ${result.failed.length}.`;
    }
    return null;
  }
  if (result.kind === "blocked_contract") return result.message;
  if (result.kind === "error") {
    if (result.failed?.length) {
      return `${result.message} (${result.failed.length} записей).`;
    }
    return result.message;
  }
  return null;
}

export function personalMutationFailedIds(result: PersonalMutationResult): string[] {
  if (result.ok && result.kind === "partial") return result.failed.map((f) => f.appealId);
  if (!result.ok && result.kind === "error") return result.failed?.map((f) => f.appealId) ?? [];
  return [];
}

/** P3 refetch hook surface — GET map when list endpoint embeds meta or dedicated load arrives. */
export type ObserverPersonalMetaMap = Record<string, ObserverPersonalMeta>;
