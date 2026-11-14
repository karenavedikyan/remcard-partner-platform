/**
 * П5 — receiving bulk UI ↔ K1 `POST /api/pro/client-appeals/batch` (tip ref 51353825).
 * Fetch lives in P6 `receiving-appeals-api.ts` only; observer personal stays K5 adapter.
 */
import type { ReceivingAppealBucket } from "./ReceivingBulkActions";
import type { ReceivingBulkAction } from "./ReceivingBulkActions";

export const K1_RECEIVING_BATCH_REF = "a71b8f37f526d775cd99f0535705be678b72261e" as const;
/** P2 partner types pin — per-id PATCH body + `expectedRevision` (no batch-edit route). */
export const P2_RECEIVING_PATCH_REF = "c49d71dceae8e221fc3e321056b091d7e3347be5" as const;

export type ReceivingBulkConfirmKind = "archive" | "delete" | "unarchive" | "restore";

export type ReceivingWorkingStageOption = { id: string; label: string };

/** Draft from `ReceivingBulkEditPanel` (prototype `renderBulkEditPanel`). */
export type ReceivingBulkEditDraft = {
  stageId: string;
  serviceNote: string;
  appendNote: boolean;
};

/**
 * P6 transport: one `PATCH /api/pro/client-appeals/:id` per intent (sequential or parallel).
 * Field names follow P2 `ClientAppealPatch` — P6 `receiving-appeals-api.ts` maps to wire JSON.
 */
export type ReceivingAppealPatchBody = {
  expectedRevision?: number;
  stageId?: string;
  serviceNote?: string;
  serviceNoteAppend?: boolean;
};

export type ReceivingAppealPatchIntent = {
  appealId: string;
  body: ReceivingAppealPatchBody;
};

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
  /** K1 need not echo the action; an explicit echo must match the request. */
  action?: ReceivingCrmBatchAction;
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

export function receivingConfirmToBatchAction(kind: ReceivingBulkConfirmKind): ReceivingCrmBatchAction {
  if (kind === "delete") return "trash";
  return kind;
}

export function buildReceivingBulkPatchIntents(
  appealIds: readonly string[],
  draft: ReceivingBulkEditDraft,
  opts: {
    stageBlocked: boolean;
    stageLockedIds?: ReadonlySet<string>;
    revisions?: Record<string, number>;
  },
): { intents: ReceivingAppealPatchIntent[]; validationError?: string } {
  const wantStage = !opts.stageBlocked && Boolean(draft.stageId.trim());
  const wantNote = Boolean(draft.serviceNote.trim());
  if (!wantStage && !wantNote) {
    return { intents: [], validationError: "Укажите этап или заметку" };
  }
  const intents: ReceivingAppealPatchIntent[] = [];
  for (const appealId of appealIds) {
    const body: ReceivingAppealPatchBody = {
      expectedRevision: opts.revisions?.[appealId],
    };
    if (wantStage && !opts.stageLockedIds?.has(appealId)) {
      body.stageId = draft.stageId;
    }
    if (wantNote) {
      body.serviceNote = draft.serviceNote;
      body.serviceNoteAppend = draft.appendNote;
    }
    if (body.stageId || body.serviceNote) {
      intents.push({ appealId, body });
    }
  }
  return { intents };
}

export function aggregateReceivingPatchResults(
  outcomes: Array<{ appealId: string; ok: boolean; reason?: string; message?: string }>,
): ReceivingBulkMutationResult {
  const updatedIds = outcomes.filter((o) => o.ok).map((o) => o.appealId);
  const failures: ReceivingBatchFailure[] = outcomes
    .filter((o) => !o.ok)
    .map((o) => ({
      id: o.appealId,
      reason: o.reason ?? "patch_failed",
      message: o.message ?? "Не удалось обновить.",
    }));
  const skippedIds = failures.map((f) => f.id);
  return normalizeReceivingBatchResponse({
    action: "archive",
    updatedIds,
    skippedIds,
    failures,
  }, { ids: outcomes.map((o) => o.appealId), action: "archive" });
}

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

function isReceivingBatchId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Bind evidence to this exact request. Never infer success from HTTP status or omission. */
export function normalizeReceivingBatchResponse(
  raw: unknown,
  request: { ids: readonly string[]; action: ReceivingCrmBatchAction },
): ReceivingBulkMutationResult {
  const requested = [...new Set(request.ids.filter(isReceivingBatchId))];
  const invalidResponse = (): ReceivingBulkMutationResult => ({
    ok: false,
    kind: "error",
    message: "Не удалось подтвердить результат группового действия.",
    failures: requested.map((id) => ({
      id, reason: "invalid_response", message: "Некорректный ответ сервера.",
    })),
    preserveUi: true,
  });
  if (requested.length === 0) return invalidResponse();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalidResponse();
  const payload = raw as Record<string, unknown>;
  if (
    !Array.isArray(payload.updatedIds) || !payload.updatedIds.every(isReceivingBatchId) ||
    !Array.isArray(payload.skippedIds) || !payload.skippedIds.every(isReceivingBatchId) ||
    !Array.isArray(payload.failures) ||
    !payload.failures.every((f) =>
      f !== null && typeof f === "object" && !Array.isArray(f) &&
      isReceivingBatchId((f as Record<string, unknown>).id)) ||
    (payload.action !== undefined && payload.action !== request.action)
  ) return invalidResponse();

  const requestedSet = new Set(requested);
  const updatedSet = new Set(payload.updatedIds.filter((id) => requestedSet.has(id)));
  const skippedSet = new Set(payload.skippedIds.filter((id) => requestedSet.has(id)));
  const failureById = new Map<string, ReceivingBatchFailure>();
  for (const entry of payload.failures) {
    const f = entry as Record<string, unknown> & { id: string };
    if (!requestedSet.has(f.id) || failureById.has(f.id)) continue;
    failureById.set(f.id, {
      id: f.id,
      code: typeof f.code === "string" ? f.code : undefined,
      reason: typeof f.reason === "string" ? f.reason : undefined,
      message: typeof f.message === "string" ? f.message : undefined,
    });
  }

  const updatedIds: string[] = [];
  const failures: ReceivingBatchFailure[] = [];
  for (const id of requested) {
    const negative = skippedSet.has(id) || failureById.has(id);
    if (updatedSet.has(id) && !negative) {
      updatedIds.push(id);
    } else if (updatedSet.has(id)) {
      failures.push({
        id, reason: "contradictory_result",
        message: "Сервер вернул противоречивый результат для записи.",
      });
    } else {
      failures.push(failureById.get(id) ?? {
        id,
        reason: skippedSet.has(id) ? "skipped" : "omitted",
        message: skippedSet.has(id)
          ? "Запись пропущена."
          : "Сервер не подтвердил обновление записи.",
      });
    }
  }

  if (updatedIds.length === 0) {
    return {
      ok: false,
      kind: "error",
      message: "Ни одна запись не подтверждена как обновлённая.",
      failures,
      preserveUi: true,
    };
  }

  if (failures.length === 0) {
    return { ok: true, kind: "full", updatedIds };
  }

  return {
    ok: true,
    kind: "partial",
    updatedIds,
    skippedIds: failures.map((f) => f.id),
    failures,
  };
}

export function receivingBulkErrorMessage(result: ReceivingBulkMutationResult): string | null {
  if (result.ok) {
    if (result.kind === "partial") {
      const n = receivingBulkFailedIds(result).length;
      return `Обновлено: ${result.updatedIds.length}, пропущено: ${n}.`;
    }
    return null;
  }
  if (result.failures?.length) {
    return `${result.message} (${receivingBulkFailedIds(result).length} записей).`;
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
    return [...new Set(result.failures.map((f) => f.id).filter(Boolean))];
  }
  return [];
}

export function receivingBulkUpdatedIds(result: ReceivingBulkMutationResult): string[] {
  if (!result.ok) return [];
  return result.updatedIds;
}

/** P6: remove successes only; keep skipped/failed selected; never clear on error. */
/** Confirm retry posts only IDs still selected (excludes prior partial successes). */
export function receivingBulkConfirmTargetIds(
  confirmIds: readonly string[],
  selected: ReadonlySet<string>,
): string[] {
  return [...new Set(confirmIds)].filter((id) => selected.has(id));
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
