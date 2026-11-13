/**
 * P6 transport only — per-id PATCH orchestration. Intent/payload rules: P5 `receiving-bulk-handoff.ts` @ 1298491f.
 */
import {
  aggregateReceivingPatchResults,
  buildReceivingBulkPatchIntents,
  type ReceivingAppealPatchIntent,
  type ReceivingBulkEditDraft,
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

export function isReceivingFinancialStageKey(stageKey: string): boolean {
  return stageKey === RECEIVING_SYSTEM_STAGE.PAID || stageKey === RECEIVING_SYSTEM_STAGE.SHIPPED;
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
): Promise<{ appealId: string; ok: boolean; reason?: string; message?: string }> {
  const { appealId, body } = intent;
  const detail = await deps.fetchDetail(appealId);
  if (!detail.ok) {
    return { appealId, ok: false, reason: detail.code, message: detail.message };
  }

  let noteSnapshot = receivingBulkNoteSnapshotFromWire(detail.wire);
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
          reason: refreshed.code ?? "ERROR",
          message: RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED,
        };
      }
      return { appealId, ok: true };
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
        reason: profRes.code === "CONFLICT" ? "version_conflict" : profRes.code,
        message: conflictMsg,
      };
    }
  }

  return { appealId, ok: true };
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
) {
  const built = buildReceivingBulkPatchIntents(ids, draft, {
    stageBlocked: ctx.stageBlocked,
    stageLockedIds: ctx.stageLockedIds,
  });

  if (built.validationError) {
    return aggregateReceivingPatchResults(
      ids.map((id) => ({
        appealId: id,
        ok: false,
        reason: "validation",
        message: built.validationError,
      })),
    );
  }

  if (built.intents.length === 0) {
    return aggregateReceivingPatchResults(
      ids.map((id) => ({
        appealId: id,
        ok: false,
        reason: "validation",
        message: "Нет применимых изменений для выбранных записей.",
      })),
    );
  }

  const outcomes: Array<{ appealId: string; ok: boolean; reason?: string; message?: string }> = [];
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

  return aggregateReceivingPatchResults(outcomes);
}
