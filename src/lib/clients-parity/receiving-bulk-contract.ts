/**
 * P6 workspace bulk contract — aligned with P5 `receiving-bulk-handoff.ts` @ `ca2855fb`
 * (read via git show; Root merges P5 owner files — do not treat this as P5 source of truth).
 */
export type ReceivingAppealBucket = "active" | "archive" | "trash";

export type ReceivingBulkAction =
  | "edit-open"
  | "archive-ask"
  | "delete-ask"
  | "unarchive-ask"
  | "restore-ask"
  | "clear";

export type ReceivingBulkContractState = "blocked" | "ready" | "pending";

export const P5_RECEIVING_BULK_DEPENDENCY_SHA = "ca2855fb9b470d04b4d7358b74776cefe79a93f8" as const;

export type ReceivingCrmBatchAction = "archive" | "unarchive" | "trash" | "restore";

export type ReceivingBatchFailure = {
  id: string;
  code?: string;
  reason?: string;
  message?: string;
};

export type ReceivingBatchResponse = {
  action: ReceivingCrmBatchAction;
  updatedIds: string[];
  skippedIds: string[];
  failures: ReceivingBatchFailure[];
};

export type ReceivingPerIdBulkApplyResult = {
  updatedIds: string[];
  skippedIds: string[];
  failures: ReceivingBatchFailure[];
};

export type ReceivingBulkMutationResult =
  | { ok: true; kind: "full"; updatedIds: string[] }
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
  return normalizeReceivingPerIdBulkApply({
    updatedIds: raw.updatedIds,
    skippedIds: raw.skippedIds,
    failures: raw.failures,
  });
}

export function normalizeReceivingPerIdBulkApply(
  raw: ReceivingPerIdBulkApplyResult,
): ReceivingBulkMutationResult {
  const updatedIds = Array.isArray(raw.updatedIds) ? raw.updatedIds : [];
  const skippedIds = Array.isArray(raw.skippedIds) ? raw.skippedIds : [];
  const failures = Array.isArray(raw.failures) ? raw.failures : [];
  const failedIdSet = new Set([...skippedIds, ...failures.map((f) => f.id).filter(Boolean)]);

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
  return { ok: true, kind: "partial", updatedIds, skippedIds, failures };
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
