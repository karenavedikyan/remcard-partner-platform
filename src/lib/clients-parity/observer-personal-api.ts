/**
 * Partner П5 client for K5 personal overlay (navigator `ClientAppealPersonalOverlay`).
 * Canonical ref: remcard-navigator @ fc33b4fa — `src/lib/clientAppeals/contract.ts`.
 * BFF `/api/remcard` → P1 proxy. Never AgentClient CRUD.
 */
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ObserverPersonalBucket, ObserverPersonalMeta } from "@/lib/clients-parity/types";

export const K8_NAVIGATOR_CONTRACT_REF = "fc33b4fae859fb692757807c3b27696b66d57558" as const;

/** K5 mutation routes (candidate until navigator K5 + P1 allowlist ship). */
export const OBSERVER_PERSONAL_OVERLAY_ROUTE =
  "/api/pro/client-appeals/:appealId/personal-overlay" as const;
export const OBSERVER_PERSONAL_BATCH_ROUTE = "/api/pro/client-appeals/personal-overlay/batch" as const;

/** @deprecated P2 draft name — do not use in new wire-ups */
export const LEGACY_REFERRED_PERSONAL_META_ROUTE =
  "/api/pro/referred-appeals/:appealId/personal-meta" as const;

/** Wire shape for navigator `ClientAppealPersonalOverlay` (observer-safe subset). */
export type ClientAppealPersonalOverlayDto = {
  appealId: string;
  alias: string | null;
  tag: string | null;
  note: string | null;
  bucket: ObserverPersonalBucket;
  beforeTrashBucket: ObserverPersonalBucket | null;
  version: number;
  updatedAt: string;
};

export type PersonalMetaPatch = {
  alias?: string | null;
  tag?: string | null;
  note?: string | null;
  bucket?: ObserverPersonalBucket;
  clearTag?: boolean;
  /** Optimistic concurrency — required once server returns overlay.version (K5). */
  expectedVersion?: number;
};

export type PersonalBatchOperation =
  | { op: "set-tag"; ids: string[]; tag: string; expectedVersions?: Record<string, number> }
  | { op: "set-bucket"; ids: string[]; bucket: ObserverPersonalBucket; expectedVersions?: Record<string, number> };

export type PersonalMetaFailure = {
  appealId: string;
  code: "forbidden" | "not_found" | "version_conflict" | "validation" | string;
  message: string;
};

export type PersonalMutationResult =
  | {
      ok: true;
      kind: "full";
      appliedIds: string[];
      overlaysById?: Record<string, ClientAppealPersonalOverlayDto>;
      metaById?: Record<string, ObserverPersonalMeta>;
    }
  | {
      ok: true;
      kind: "partial";
      appliedIds: string[];
      failed: PersonalMetaFailure[];
      overlaysById?: Record<string, ClientAppealPersonalOverlayDto>;
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
      failed?: PersonalMetaFailure[];
      preserveUi: true;
    };

type PersonalOverlayResponse = {
  overlay?: ClientAppealPersonalOverlayDto;
};

type PersonalBatchResponse = {
  applied?: string[];
  failed?: PersonalMetaFailure[];
  overlaysById?: Record<string, ClientAppealPersonalOverlayDto>;
};

export function overlayPath(appealId: string) {
  return `/api/pro/client-appeals/${encodeURIComponent(appealId)}/personal-overlay`;
}

export function mapOverlayToPartnerMeta(overlay: ClientAppealPersonalOverlayDto): ObserverPersonalMeta {
  return {
    alias: overlay.alias ?? undefined,
    tag: overlay.tag ?? undefined,
    note: overlay.note ?? undefined,
    bucket: overlay.bucket,
  };
}

export function mapOverlaysToMetaMap(
  overlays: Record<string, ClientAppealPersonalOverlayDto>,
): Record<string, ObserverPersonalMeta> {
  return Object.fromEntries(Object.entries(overlays).map(([id, o]) => [id, mapOverlayToPartnerMeta(o)]));
}

function withMetaMaps(
  overlaysById?: Record<string, ClientAppealPersonalOverlayDto>,
): { overlaysById?: Record<string, ClientAppealPersonalOverlayDto>; metaById?: Record<string, ObserverPersonalMeta> } {
  if (!overlaysById) return {};
  return { overlaysById, metaById: mapOverlaysToMetaMap(overlaysById) };
}

export function isPersonalPersistProxyBlocked(error: unknown): boolean {
  if (!(error instanceof RemcardApiError)) return false;
  if (error.status === 404 || error.status === 403 || error.status === 501) return true;
  const code = error.body?.code ?? "";
  return (
    code === "PROXY_ROUTE_NOT_ALLOWED" ||
    code === "BLOCKED_CONTRACT" ||
    code === "NOT_IMPLEMENTED" ||
    code === "client_appeals_schema_unavailable"
  );
}

function blockedContract(): PersonalMutationResult {
  return {
    ok: false,
    kind: "blocked_contract",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    message:
      "Маршруты client-appeals personal-overlay ещё не доступны (K5 navigator + P1 proxy + approved migration).",
  };
}

function mapHttpError(error: RemcardApiError): PersonalMutationResult {
  const code = error.body?.code ?? "";
  if (error.status === 409 || code === "version_conflict") {
    const serverVersion =
      typeof error.body?.fields?.version === "string"
        ? Number(error.body.fields.version)
        : undefined;
    return {
      ok: false,
      kind: "conflict",
      message: error.message || "Данные изменились на сервере. Обновите список и повторите.",
      serverVersion: Number.isFinite(serverVersion) ? serverVersion : undefined,
      preserveUi: true,
    };
  }
  return {
    ok: false,
    kind: "error",
    message: error.message,
    status: error.status,
    preserveUi: true,
  };
}

function normalizeBatch(raw: PersonalBatchResponse, fallbackIds: string[]): PersonalMutationResult {
  const applied = raw.applied ?? [];
  const failed = raw.failed ?? [];
  const maps = withMetaMaps(raw.overlaysById);
  if (failed.length === 0) {
    return {
      ok: true,
      kind: "full",
      appliedIds: applied.length ? applied : fallbackIds,
      ...maps,
    };
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
  return { ok: true, kind: "partial", appliedIds: applied, failed, ...maps };
}

export async function patchObserverPersonalMeta(
  appealId: string,
  patch: PersonalMetaPatch,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  try {
    const body = await remcardFetch<PersonalOverlayResponse>(overlayPath(appealId), {
      method: "PATCH",
      body: patch,
      requireCsrf: true,
      signal,
    });
    if (!body?.overlay) {
      return { ok: false, kind: "error", message: "Ответ сервера без overlay.", preserveUi: true };
    }
    const meta = mapOverlayToPartnerMeta(body.overlay);
    return {
      ok: true,
      kind: "full",
      appliedIds: [appealId],
      overlaysById: { [appealId]: body.overlay },
      metaById: { [appealId]: meta },
    };
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedContract();
    if (error instanceof RemcardApiError) return mapHttpError(error);
    throw error;
  }
}

export async function postObserverPersonalBatch(
  operation: PersonalBatchOperation,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  try {
    const body = await remcardFetch<PersonalBatchResponse>(OBSERVER_PERSONAL_BATCH_ROUTE, {
      method: "POST",
      body: operation,
      requireCsrf: true,
      signal,
    });
    return normalizeBatch(body, operation.ids);
  } catch (error) {
    if (isPersonalPersistProxyBlocked(error)) return blockedContract();
    if (error instanceof RemcardApiError) {
      const mapped = mapHttpError(error);
      if (mapped.kind === "conflict") return mapped;
      return mapped;
    }
    throw error;
  }
}

export async function saveObserverPersonalSingle(
  appealId: string,
  draft: { alias: string; tag: string; note: string },
  expectedVersion?: number,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return patchObserverPersonalMeta(
    appealId,
    {
      alias: draft.alias || null,
      tag: draft.tag,
      note: draft.note || null,
      clearTag: draft.tag.length === 0,
      expectedVersion,
    },
    signal,
  );
}

export async function saveObserverPersonalBulkTag(
  ids: string[],
  tag: string,
  expectedVersions?: Record<string, number>,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return postObserverPersonalBatch({ op: "set-tag", ids, tag, expectedVersions }, signal);
}

export async function moveObserverPersonalBucket(
  ids: string[],
  bucket: ObserverPersonalBucket,
  expectedVersions?: Record<string, number>,
  signal?: AbortSignal,
): Promise<PersonalMutationResult> {
  return postObserverPersonalBatch({ op: "set-bucket", ids, bucket, expectedVersions }, signal);
}

export function personalMutationErrorMessage(result: PersonalMutationResult): string | null {
  if (result.ok) {
    if (result.kind === "partial") {
      return `Обновлено: ${result.appliedIds.length}, ошибок: ${result.failed.length}.`;
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
  if (!result.ok) return result.preserveUi;
  if (result.kind === "partial") return true;
  return false;
}

export type ObserverPersonalMetaMap = Record<string, ObserverPersonalMeta>;
