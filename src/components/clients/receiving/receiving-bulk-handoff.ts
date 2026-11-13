/**
 * П5 — receiving bulk UI ↔ K1 `POST /api/pro/client-appeals/batch` (tip ref 51353825).
 * Fetch lives in P6 `receiving-appeals-api.ts` only; observer personal stays K5 adapter.
 */
import type { ReceivingAppealBucket } from "./ReceivingBulkActions";
import type { ReceivingBulkAction } from "./ReceivingBulkActions";

export const K1_RECEIVING_BATCH_REF = "51353825" as const;

/** Navigator batch body action (K1). Not financial ops. */
export type ReceivingCrmBatchAction = "archive" | "unarchive" | "trash" | "restore";

export type ReceivingBatchFailure = {
  id: string;
  code?: string;
  reason?: string;
  message?: string;
};

/** K1 batch HTTP JSON (authoritative fields per integration audit). */
export type ReceivingBatchResponse = {
  action: ReceivingCrmBatchAction;
  updatedIds: string[];
  skippedIds: string[];
  failures: ReceivingBatchFailure[];
};

export type ReceivingBulkMutationResult =
  | {
      ok: true;
      kind: "full";
      updatedIds: string[];
    }
  | {
      ok: true;
      kind: "partial";
      updatedIds: string[];
      skippedIds: string[];
      failures: ReceivingBatchFailure[];
    }
  | {
      ok: false;
      kind: "blocked_contract" | "error";
      message: string;
      failures?: ReceivingBatchFailure[];
      preserveUi: true;
    };

export type ReceivingBulkEditScope = "patch-single" | "patch-multi";

export function receivingToolbarToBatchAction(
  action: ReceivingBulkAction,
  bucket: ReceivingAppealBucket,
): ReceivingCrmBatchAction | ReceivingBulkEditScope | null {
  switch (action) {
    case "archive-ask":
      return "archive";
    case "unarchive-ask":
      return "unarchive";
    case "delete-ask":
      return bucket === "active" || bucket === "archive" ? "trash" : null;
    case "restore-ask":
      return "restore";
    case "edit-open":
      return "patch-multi";
    case "clear":
      return null;
    default:
      return null;
  }
}

export function normalizeReceivingBatchResponse(raw: ReceivingBatchResponse): ReceivingBulkMutationResult {
  const updatedIds = Array.isArray(raw.updatedIds) ? raw.updatedIds : [];
  const skippedIds = Array.isArray(raw.skippedIds) ? raw.skippedIds : [];
  const failures = Array.isArray(raw.failures) ? raw.failures : [];
  const failedIdSet = new Set([
    ...skippedIds,
    ...failures.map((f) => f.id).filter(Boolean),
  ]);

  if (updatedIds.length === 0 && failedIdSet.size > 0) {
    return {
      ok: false,
      kind: "error",
      message: "Ни одна запись не обновлена.",
      failures,
      preserveUi: true,
    };
  }

  if (failedIdSet.size === 0) {
    return { ok: true, kind: "full", updatedIds };
  }

  return {
    ok: true,
    kind: "partial",
    updatedIds,
    skippedIds,
    failures,
  };
}

export function receivingBulkErrorMessage(result: ReceivingBulkMutationResult): string | null {
  if (result.ok) {
    if (result.kind === "partial") {
      const n = result.skippedIds.length + result.failures.length;
      return `Обновлено: ${result.updatedIds.length}, пропущено: ${n}.`;
    }
    return null;
  }
  if (result.failures?.length) {
    return `${result.message} (${result.failures.length} записей).`;
  }
  return result.message;
}

export function receivingBulkPreserveSelection(result: ReceivingBulkMutationResult): boolean {
  if (!result.ok) return result.preserveUi;
  return result.kind === "partial";
}

export function receivingBulkFailedIds(result: ReceivingBulkMutationResult): string[] {
  if (result.ok && result.kind === "partial") {
    const fromFailures = result.failures.map((f) => f.id).filter(Boolean);
    return [...new Set([...result.skippedIds, ...fromFailures])];
  }
  if (!result.ok && result.failures?.length) {
    return result.failures.map((f) => f.id).filter(Boolean);
  }
  return [];
}

export function receivingBulkUpdatedIds(result: ReceivingBulkMutationResult): string[] {
  if (!result.ok) return [];
  return result.updatedIds;
}

/** P6: remove successes only; keep skipped/failed selected; never clear on error. */
export function receivingBulkMergeSelection(
  currentSelected: readonly string[],
  result: ReceivingBulkMutationResult,
): string[] {
  const next = new Set(currentSelected);
  for (const id of receivingBulkFailedIds(result)) next.add(id);
  if (result.ok) {
    for (const id of result.updatedIds) next.delete(id);
  }
  return [...next];
}
