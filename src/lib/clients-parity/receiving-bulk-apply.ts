/**
 * P6 transport only — per-id PATCH orchestration. Intent/payload rules: P5 `receiving-bulk-handoff.ts` @ 1298491f.
 */
import {
  aggregateReceivingPatchResults,
  buildReceivingBulkPatchIntents,
  type ReceivingAppealPatchIntent,
  type ReceivingBulkEditDraft,
  type ReceivingBulkMutationResult,
} from "@/components/clients/receiving/receiving-bulk-handoff";
import {
  RECEIVING_SYSTEM_STAGE,
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  patchReceivingAppealStageCas,
  type ReceivingAppealDetailWire,
  type ReceivingAppealListRow,
  type ReceivingWorkingStage,
} from "./receiving-appeals-api";

export type { ReceivingBulkEditDraft };

export const RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED =
  "Этап сохранён; заметку не обновили — не удалось перечитать карточку после смены этапа." as const;

export function isReceivingAppealLockedForBulkStage(row: ReceivingAppealListRow): boolean {
  const locked = new Set<string>([
    RECEIVING_SYSTEM_STAGE.PAID,
    RECEIVING_SYSTEM_STAGE.SHIPPED,
    RECEIVING_SYSTEM_STAGE.REFUSED,
    RECEIVING_SYSTEM_STAGE.RETURN,
  ]);
  return locked.has(row.stageId);
}

/** K1 `isBulkStageAllowed` — PAID, SHIPPED, RETURN (no bulk stage transitions). */
export function isReceivingFinancialStageKey(stageKey: string): boolean {
  return (
    stageKey === RECEIVING_SYSTEM_STAGE.PAID ||
    stageKey === RECEIVING_SYSTEM_STAGE.SHIPPED ||
    stageKey === RECEIVING_SYSTEM_STAGE.RETURN
  );
}

export function revisionFromReceivingDetailWire(wire: ReceivingAppealDetailWire): number {
  return typeof wire.revision === "number" ? wire.revision : Number(wire.revision) || 0;
}

/** Notes + revision must always come from the same GET snapshot before profile PATCH. */
export type ReceivingBulkNoteSnapshot = {
  revision: number;
  privateNotes: string;
};

export function receivingBulkNoteSnapshotFromWire(
  wire: ReceivingAppealDetailWire,
): ReceivingBulkNoteSnapshot {
  return {
    revision: revisionFromReceivingDetailWire(wire),
    privateNotes: wire.appeal.privateNotes?.trim() ?? "",
  };
}

export function mergeServiceNote(
  existing: string,
  piece: string,
  append: boolean | undefined,
): string {
  const trimmed = piece.trim();
  if (!trimmed) return existing;
  if (append === false) return trimmed.slice(0, 4000);
  return [existing, trimmed].filter(Boolean).join("\n").slice(0, 4000);
}

/** Profile PATCH body derived from one wire snapshot — never mix revision from refresh A with notes from GET B. */
export function receivingBulkProfileNotePatchFromSnapshot(
  snapshot: ReceivingBulkNoteSnapshot,
  serviceNote: string,
  append: boolean | undefined,
): { privateNotes: string; expectedRevision: number } {
  return {
    privateNotes: mergeServiceNote(snapshot.privateNotes, serviceNote, append),
    expectedRevision: snapshot.revision,
  };
}

export type ReceivingBulkIntentOutcome = {
  appealId: string;
  ok: boolean;
  reason?: string;
  message?: string;
  /** Stage PATCH succeeded while a later step failed — list must refresh. */
  stageApplied?: boolean;
};

export const RECEIVING_BULK_EXPECTED_REVISION_CONFLICT =
  "Версия обращения не совпадает с выбранной записью. Обновите список." as const;

/** P5 optional `expectedRevision` on intent — reject before any write when it disagrees with initial GET. */
export function receivingBulkExpectedRevisionConflictsWithSnapshot(
  body: ReceivingAppealPatchIntent["body"],
  snapshot: ReceivingBulkNoteSnapshot,
): boolean {
  if (body.expectedRevision === undefined || body.expectedRevision === null) return false;
  const expected =
    typeof body.expectedRevision === "number"
      ? body.expectedRevision
      : Number(body.expectedRevision);
  if (Number.isNaN(expected)) return false;
  return expected !== snapshot.revision;
}

export function receivingBulkApplyNeedsListReload(outcomes: ReceivingBulkIntentOutcome[]): boolean {
  return outcomes.some((o) => o.ok || o.stageApplied);
}

export type ReceivingBulkApplyRun = {
  result: ReceivingBulkMutationResult;
  outcomes: ReceivingBulkIntentOutcome[];
};

type DetailFetchResult = Awaited<ReturnType<typeof fetchReceivingAppealDetailWire>>;
type PatchStageResult = Awaited<ReturnType<typeof patchReceivingAppealStageCas>>;
type PatchProfileResult = Awaited<ReturnType<typeof patchReceivingAppealProfileCas>>;

export type ReceivingBulkApplyTransportDeps = {
  fetchDetail: (id: string) => Promise<DetailFetchResult>;
  patchStage: typeof patchReceivingAppealStageCas;
  patchProfile: typeof patchReceivingAppealProfileCas;
};

const defaultBulkApplyTransport: ReceivingBulkApplyTransportDeps = {
  fetchDetail: fetchReceivingAppealDetailWire,
  patchStage: patchReceivingAppealStageCas,
  patchProfile: patchReceivingAppealProfileCas,
};

export async function applyOneReceivingBulkIntent(
  intent: ReceivingAppealPatchIntent,
  row: ReceivingAppealListRow | undefined,
  deps: ReceivingBulkApplyTransportDeps = defaultBulkApplyTransport,
): Promise<ReceivingBulkIntentOutcome> {
  const { appealId, body } = intent;
  const detail = await deps.fetchDetail(appealId);
  if (!detail.ok) {
    return { appealId, ok: false, reason: detail.code, message: detail.message };
  }

  let noteSnapshot = receivingBulkNoteSnapshotFromWire(detail.wire);
  if (receivingBulkExpectedRevisionConflictsWithSnapshot(body, noteSnapshot)) {
    return {
      appealId,
      ok: false,
      reason: "version_conflict",
      message: RECEIVING_BULK_EXPECTED_REVISION_CONFLICT,
    };
  }

  let stageMutated = false;

  if (
    body.stageId &&
    row &&
    !isReceivingAppealLockedForBulkStage(row) &&
    !isReceivingFinancialStageKey(body.stageId) &&
    row.stageId !== body.stageId
  ) {
    const stageRes = await deps.patchStage(appealId, {
      stageKey: body.stageId,
      expectedRevision: noteSnapshot.revision,
    });
    if (!stageRes.ok) {
      return {
        appealId,
        ok: false,
        reason: stageRes.code === "CONFLICT" ? "version_conflict" : stageRes.code,
        message: stageRes.message,
      };
    }
    stageMutated = true;
    const refreshed = await deps.fetchDetail(appealId);
    if (!refreshed.ok) {
      if (body.serviceNote?.trim()) {
        return {
          appealId,
          ok: false,
          stageApplied: true,
          reason: refreshed.code ?? "ERROR",
          message: RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED,
        };
      }
      return { appealId, ok: true, stageApplied: true };
    }
    noteSnapshot = receivingBulkNoteSnapshotFromWire(refreshed.wire);
  }

  if (body.serviceNote?.trim()) {
    const patchBody = receivingBulkProfileNotePatchFromSnapshot(
      noteSnapshot,
      body.serviceNote,
      body.serviceNoteAppend,
    );
    const profRes = await deps.patchProfile(appealId, patchBody);
    if (!profRes.ok) {
      const conflictMsg =
        profRes.code === "CONFLICT" && stageMutated
          ? `${profRes.message} (этап уже изменён; заметка не сохранена.)`
          : profRes.message;
      return {
        appealId,
        ok: false,
        stageApplied: stageMutated || undefined,
        reason: profRes.code === "CONFLICT" ? "version_conflict" : profRes.code,
        message: conflictMsg,
      };
    }
  }

  return { appealId, ok: true, stageApplied: stageMutated || undefined };
}

/** Serial per-id PATCH — intents from P5 `buildReceivingBulkPatchIntents`. */
export async function applyReceivingBulkEditsPerId(
  ids: string[],
  draft: ReceivingBulkEditDraft,
  ctx: {
    appeals: ReceivingAppealListRow[];
    workingStages: ReceivingWorkingStage[];
    stageBlocked: boolean;
    stageLockedIds?: ReadonlySet<string>;
  },
  deps: ReceivingBulkApplyTransportDeps = defaultBulkApplyTransport,
): Promise<ReceivingBulkApplyRun> {
  const built = buildReceivingBulkPatchIntents(ids, draft, {
    stageBlocked: ctx.stageBlocked,
    stageLockedIds: ctx.stageLockedIds,
  });

  if (built.validationError) {
    const outcomes: ReceivingBulkIntentOutcome[] = ids.map((id) => ({
      appealId: id,
      ok: false,
      reason: "validation",
      message: built.validationError,
    }));
    return { result: aggregateReceivingPatchResults(outcomes), outcomes };
  }

  if (built.intents.length === 0) {
    const outcomes: ReceivingBulkIntentOutcome[] = ids.map((id) => ({
      appealId: id,
      ok: false,
      reason: "validation",
      message: "Нет применимых изменений для выбранных записей.",
    }));
    return { result: aggregateReceivingPatchResults(outcomes), outcomes };
  }

  const outcomes: ReceivingBulkIntentOutcome[] = [];
  const byId = new Map(ctx.appeals.map((a) => [a.id, a]));
  for (const intent of built.intents) {
    outcomes.push(await applyOneReceivingBulkIntent(intent, byId.get(intent.appealId), deps));
  }

  const intentIds = new Set(built.intents.map((i) => i.appealId));
  for (const id of ids) {
    if (!intentIds.has(id)) {
      outcomes.push({
        appealId: id,
        ok: false,
        reason: "skipped",
        message: "Пропущено (заблокированный этап или без изменений).",
      });
    }
  }

  return { result: aggregateReceivingPatchResults(outcomes), outcomes };
}
