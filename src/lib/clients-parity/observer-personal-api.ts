/**
 * Partner П5 — wire client for navigator K5 personal routes @ 86ac3e35.
 * PATCH/POST /api/pro/referred-appeals/... — never AgentClient CRUD.
 */
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ObserverPersonalBucket, ObserverPersonalMeta } from "@/lib/clients-parity/types";

export const K5_NAVIGATOR_CONTRACT_REF = "86ac3e354dc543817c061cb43565d0bf77545ab0" as const;
/** Session + principal gate (referrer-only overlays); K5 source-only. */
export const K5_NAVIGATOR_GATE_REF = "6c444487" as const;
/** Receiving list identity: `receivingPartnerUserId` = User.id; org/branch optional (K8). */
export const K8_RECEIVING_IDENTITY_REF = "6f09c23e" as const;

export type ObserverPersonalConfirmKind = "archived" | "trash" | "restore";

export const OBSERVER_PERSONAL_META_ROUTE = "/api/pro/referred-appeals/:appealId/personal-meta" as const;
export const OBSERVER_PERSONAL_BATCH_ROUTE = "/api/pro/referred-appeals/personal-batch" as const;

export type K5PersonalBatchMode = "atomic" | "best_effort";
export type K5PersonalBatchAction = "move" | "restore" | "setTag";
export type K5PersonalMoveTarget = Extract<ObserverPersonalBucket, "archived" | "trash">;

/** Navigator `PersonalMetaProjection` (observer-safe). */
export type K5PersonalMetaProjection = {
  appealId: string;
  alias: string | null;
  tag: string | null;
  note: string | null;
  bucket: ObserverPersonalBucket;
  version: number;
  updatedAt: string;
};

export type PersonalMetaPatchBody = {
  expectedVersion?: number | null;
  alias?: string | null;
  tag?: string | null;
  note?: string | null;
  action?: "move" | "restore";
  target?: K5PersonalMoveTarget;
};

export type PersonalBatchRequestBody = {
  action: K5PersonalBatchAction;
  ids: string[];
  target?: K5PersonalMoveTarget;
  tag?: string | null;
  mode?: K5PersonalBatchMode;
  expectedVersions?: Record<string, number>;
};

export type PersonalMetaFailure = {
  appealId: string;
  code: "not_found" | "ineligible" | "bucket_locked" | "version_conflict" | string;
  message: string;
};

export type PersonalMutationResult =
  | {
      ok: true;
      kind: "full";
      appliedIds: string[];
      metaById?: Record<string, ObserverPersonalMeta>;
      projections?: Record<string, K5PersonalMetaProjection>;
    }
  | {
      ok: true;
      kind: "partial";
      appliedIds: string[];
      failed: PersonalMetaFailure[];
      metaById?: Record<string, ObserverPersonalMeta>;
      projections?: Record<string, K5PersonalMetaProjection>;
    }
  | {
      ok: false;
      kind: "blocked_contract";
      blockerId: "BLK-OBSERVER-PERSONAL-PERSIST";
      message: string;
    }
  | {
      ok: false;
      kind: "conflict";
      message: string;
      serverVersion?: number;
      preserveUi: true;
    }
  | {
      ok: false;
      kind: "error";
      message: string;
      status?: number;
      routeCode?: string;
      failed?: PersonalMetaFailure[];
      preserveUi: true;
    };

type PersonalMetaResponse = { meta: K5PersonalMetaProjection };

type PersonalBatchResponse = {
  action: K5PersonalBatchAction;
  mode: K5PersonalBatchMode;
  processedCount: number;
  skippedCount: number;
  processed: K5PersonalMetaProjection[];
  skipped: Array<{ appealId: string; reason: string }>;
};

type PersonalErrorBody = {
  error?: string;
  code?: string;
  details?: { currentVersion?: number; id?: string; field?: string };
};

function metaPath(appealId: string) {
  return `/api/pro/referred-appeals/${encodeURIComponent(appealId)}/personal-meta`;
}

export function mapProjectionToPartnerMeta(meta: K5PersonalMetaProjection): ObserverPersonalMeta {
  return {
    alias: meta.alias ?? undefined,
    tag: meta.tag ?? undefined,
    note: meta.note ?? undefined,
    bucket: meta.bucket,
  };
}

function metaMapFromProjections(rows: K5PersonalMetaProjection[]) {
  const metaById: Record<string, ObserverPersonalMeta> = {};
  const projections: Record<string, K5PersonalMetaProjection> = {};
  for (const row of rows) {
    metaById[row.appealId] = mapProjectionToPartnerMeta(row);
    projections[row.appealId] = row;
  }
  return { metaById, projections };
}

function mapSkippedReason(reason: string, appealId: string): PersonalMetaFailure {
  const message =
    reason === "ineligible"
      ? "Нет доступа к записи."
      : reason === "bucket_locked"
        ? "Корзина: только восстановление."
        : reason === "version_conflict"
          ? "Версия на сервере новее."
          : reason === "not_found"
            ? "Запись не найдена."
            : reason;
  return { appealId, code: reason, message };
}

/** Proxy layer missing route only — not navigator 401/403/404/409. */
export function isPersonalPersistProxyBlocked(error: unknown): boolean {
  if (!(error instanceof RemcardApiError)) return false;
  const code = (error.body as PersonalErrorBody | null)?.code ?? "";
  if (code === "PROXY_ROUTE_NOT_ALLOWED" || code === "NOT_IMPLEMENTED") return true;
  if (error.status === 501) return true;
  if (error.status === 404 && code === "PROXY_ROUTE_NOT_ALLOWED") return true;
  return false;
}

function blockedProxy(): PersonalMutationResult {
  return {
    ok: false,
    kind: "blocked_contract",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    message: "Маршрут K5 personal-meta не разрешён в P1 proxy.",
  };
}

function mapHttpError(error: RemcardApiError): PersonalMutationResult {
  const body = error.body as PersonalErrorBody | null;
  const code = body?.code ?? "";
  if (error.status === 409 || code === "VERSION_CONFLICT") {
    const serverVersion = body?.details?.currentVersion;
    return {
      ok: false,
      kind: "conflict",
      message: error.message || "Данные на сервере обновились. Обновите список и повторите.",
      serverVersion: typeof serverVersion === "number" ? serverVersion : undefined,
      preserveUi: true,
    };
  }
  if (code === "BUCKET_LOCKED") {
    return {
      ok: false,
      kind: "error",
      message: error.message || "Действие недоступно для корзины.",
      status: error.status,
      routeCode: code,
      preserveUi: true,
    };
  }
  if (error.status === 401) {
    return {
      ok: false,
      kind: "error",
      message: "Требуется авторизация.",
      status: 401,
      routeCode: code || "UNAUTHORIZED",
      preserveUi: true,
    };
  }
  if (error.status === 403 || code === "INELIGIBLE") {
    return {
      ok: false,
      kind: "error",
      message: error.message || "Нет права на личные действия наблюдателя.",
      status: 403,
      routeCode: code || "INELIGIBLE",
      preserveUi: true,
    };
  }
  if (error.status === 404 || code === "NOT_FOUND") {
    return {
      ok: false,
      kind: "error",
      message: error.message || "Запись недоступна.",
      status: 404,
      routeCode: code || "NOT_FOUND",
      preserveUi: true,
    };
  }
  if (error.status === 503 || code === "PERSISTENCE_UNAVAILABLE") {
    return {
      ok: false,
      kind: "blocked_contract",
      blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
      message: "Слой persistence K8 ещё не подключён на сервере.",
    };
  }
  return {
    ok: false,
    kind: "error",
    message: error.message,
    status: error.status,
    routeCode: code,
    preserveUi: true,
  };
}

function normalizeBatchResponse(raw: PersonalBatchResponse, ids: string[]): PersonalMutationResult {
  const processed = Array.isArray(raw.processed) ? raw.processed : [];
  const skipped = Array.isArray(raw.skipped) ? raw.skipped : [];
  const appliedIds = processed.map((p) => p.appealId);
  const maps = metaMapFromProjections(processed);
  const failed = skipped.map((s) => mapSkippedReason(s.reason, s.appealId));
  if (processed.length === 0 && skipped.length === 0 && ids.length > 0) {
    return {
      ok: false,
      kind: "error",
      message: "Пустой ответ personal-batch.",
      preserveUi: true,
    };
  }
  if (failed.length === 0) {
    return {
      ok: true,
      kind: "full",
      appliedIds: appliedIds.length ? appliedIds : ids,
      ...maps,
    };
  }
  if (appliedIds.length === 0) {
    return {
      ok: false,
      kind: "error",
      message: "Ни одна запись не обновлена.",
      failed,
      preserveUi: true,
    };
  }
  return { ok: true, kind: "partial", appliedIds, failed, ...maps };
}

export async function patchObserverPersonalMeta(
  appealId: string,
  body: PersonalMetaPatchBody,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  try {
    const data = await remcardFetch<PersonalMetaResponse>(metaPath(appealId), {
      method: "PATCH",
      body,
      requireCsrf: true,
      signal,
    });
    const maps = metaMapFromProjections([data.meta]);
    return { ok: true, kind: "full", appliedIds: [appealId], ...maps };
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedProxy();
    if (error instanceof RemcardApiError) return mapHttpError(error);
    throw error;
  }
}

export async function postObserverPersonalBatch(
  body: PersonalBatchRequestBody,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  const payload: PersonalBatchRequestBody = {
    ...body,
    mode: body.mode ?? "best_effort",
  };
  try {
    const data = await remcardFetch<PersonalBatchResponse>(OBSERVER_PERSONAL_BATCH_ROUTE, {
      method: "POST",
      body: payload,
      requireCsrf: true,
      signal,
    });
    return normalizeBatchResponse(data, payload.ids);
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedProxy();
    if (error instanceof RemcardApiError) return mapHttpError(error);
    throw error;
  }
}

export async function saveObserverPersonalSingle(
  appealId: string,
  draft: { alias: string; tag: string; note: string },
  expectedVersion?: number | null,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return patchObserverPersonalMeta(
    appealId,
    {
      expectedVersion,
      alias: draft.alias || null,
      tag: draft.tag || null,
      note: draft.note || null,
    },
    signal,
  );
}

export async function saveObserverPersonalBulkTag(
  ids: string[],
  tag: string,
  options?: { expectedVersions?: Record<string, number>; mode?: K5PersonalBatchMode; signal?: AbortSignal },
): Promise<PersonalMutationResult> {
  return postObserverPersonalBatch(
    {
      action: "setTag",
      ids,
      tag: tag || null,
      expectedVersions: options?.expectedVersions,
      mode: options?.mode ?? "best_effort",
    },
    options?.signal,
  );
}

export async function restoreObserverPersonal(
  ids: string[],
  options?: { expectedVersions?: Record<string, number>; mode?: K5PersonalBatchMode; signal?: AbortSignal },
): Promise<PersonalMutationResult> {
  if (ids.length === 1) {
    return patchObserverPersonalMeta(
      ids[0]!,
      { action: "restore", expectedVersion: options?.expectedVersions?.[ids[0]!] },
      options?.signal,
    );
  }
  return postObserverPersonalBatch(
    {
      action: "restore",
      ids,
      mode: options?.mode ?? "best_effort",
      expectedVersions: options?.expectedVersions,
    },
    options?.signal,
  );
}

/** Confirm panel kinds → K5 move/restore (trash from active or archived; not from trash). */
export async function runObserverPersonalConfirmAction(
  kind: ObserverPersonalConfirmKind,
  ids: string[],
  options?: { expectedVersions?: Record<string, number>; mode?: K5PersonalBatchMode; signal?: AbortSignal },
): Promise<PersonalMutationResult> {
  if (ids.length === 0) {
    return {
      ok: false,
      kind: "error",
      message: "Нет выбранных записей.",
      preserveUi: true,
    };
  }
  if (kind === "restore") return restoreObserverPersonal(ids, options);
  if (kind === "archived") return moveObserverPersonalBucket(ids, "archived", options);
  return moveObserverPersonalBucket(ids, "trash", options);
}

/** Single row: full meta patch; bulk: tag-only via batch `setTag` (prototype bulk edit). */
export async function applyObserverPersonalEdit(
  mode: "single" | "bulk",
  appealIds: string[],
  draft: { alias: string; tag: string; note: string },
  options?: {
    expectedVersion?: number | null;
    expectedVersions?: Record<string, number>;
    mode?: K5PersonalBatchMode;
    signal?: AbortSignal;
  },
): Promise<PersonalMutationResult> {
  if (appealIds.length === 0) {
    return {
      ok: false,
      kind: "error",
      message: "Нет выбранных записей.",
      preserveUi: true,
    };
  }
  if (mode === "single") {
    return saveObserverPersonalSingle(appealIds[0]!, draft, options?.expectedVersion, options?.signal);
  }
  return saveObserverPersonalBulkTag(appealIds, draft.tag, {
    expectedVersions: options?.expectedVersions,
    mode: options?.mode,
    signal: options?.signal,
  });
}

export async function moveObserverPersonalBucket(
  ids: string[],
  target: K5PersonalMoveTarget,
  options?: { expectedVersions?: Record<string, number>; mode?: K5PersonalBatchMode; signal?: AbortSignal },
): Promise<PersonalMutationResult> {
  if (ids.length === 1) {
    return patchObserverPersonalMeta(
      ids[0]!,
      {
        action: "move",
        target,
        expectedVersion: options?.expectedVersions?.[ids[0]!],
      },
      options?.signal,
    );
  }
  return postObserverPersonalBatch(
    {
      action: "move",
      ids,
      target,
      mode: options?.mode ?? "best_effort",
      expectedVersions: options?.expectedVersions,
    },
    options?.signal,
  );
}

export function personalMutationErrorMessage(result: PersonalMutationResult): string | null {
  if (result.ok) {
    if (result.kind === "partial") {
      return `Обновлено: ${result.appliedIds.length}, пропущено: ${result.failed.length}.`;
    }
    return null;
  }
  if (result.kind === "blocked_contract") return result.message;
  if (result.kind === "conflict") return result.message;
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
  if (!result.ok && result.kind === "error" && result.failed?.length) {
    return result.failed.map((f) => f.appealId);
  }
  return [];
}

export function personalMutationPreserveSelection(result: PersonalMutationResult): boolean {
  if (!result.ok) {
    if (result.kind === "blocked_contract") return true;
    return result.preserveUi;
  }
  if (result.kind === "partial") return true;
  return false;
}

/** P3: drop only successfully mutated ids; keep failed/conflict selection + edit draft. */
export function personalMutationAppliedIds(result: PersonalMutationResult): string[] {
  if (!result.ok) return [];
  return result.appliedIds;
}

/**
 * P3 selection merge after mutation:
 * - partial/error with failed ids: union failed into current selection (never clear failed rows)
 * - full success: caller may remove `personalMutationAppliedIds` from selection only
 */
export function personalMutationRetainSelectedIds(
  currentSelected: readonly string[],
  result: PersonalMutationResult,
): string[] {
  const base = new Set(currentSelected);
  for (const id of personalMutationFailedIds(result)) base.add(id);
  return [...base];
}

export type ObserverPersonalMetaMap = Record<string, ObserverPersonalMeta>;
