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
  type ReceivingAppealListRow,
  type ReceivingWorkingStage,
} from "./receiving-appeals-api";

export type { ReceivingBulkEditDraft };

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

function mergeServiceNote(
  existing: string,
  piece: string,
  append: boolean | undefined,
): string {
  const trimmed = piece.trim();
  if (!trimmed) return existing;
  if (append === false) return trimmed.slice(0, 4000);
  return [existing, trimmed].filter(Boolean).join("\n").slice(0, 4000);
}

async function applyOneIntent(
  intent: ReceivingAppealPatchIntent,
  row: ReceivingAppealListRow | undefined,
): Promise<{ appealId: string; ok: boolean; reason?: string; message?: string }> {
  const { appealId, body } = intent;
  const detail = await fetchReceivingAppealDetailWire(appealId);
  if (!detail.ok) {
    return { appealId, ok: false, reason: detail.code, message: detail.message };
  }

  let revision =
    body.expectedRevision ??
    (typeof detail.wire.revision === "number"
      ? detail.wire.revision
      : Number(detail.wire.revision) || 0);

  if (body.stageId && row && !isReceivingAppealLockedForBulkStage(row) && !isReceivingFinancialStageKey(body.stageId)) {
    if (row.stageId !== body.stageId) {
      const stageRes = await patchReceivingAppealStageCas(appealId, {
        stageKey: body.stageId,
        expectedRevision: revision,
      });
      if (!stageRes.ok) {
        return {
          appealId,
          ok: false,
          reason: stageRes.code === "CONFLICT" ? "version_conflict" : stageRes.code,
          message: stageRes.message,
        };
      }
      const refreshed = await fetchReceivingAppealDetailWire(appealId);
      if (refreshed.ok) {
        revision =
          typeof refreshed.wire.revision === "number"
            ? refreshed.wire.revision
            : Number(refreshed.wire.revision) || revision;
      }
    }
  }

  if (body.serviceNote?.trim()) {
    const existing = detail.wire.appeal.privateNotes?.trim() ?? "";
    const privateNotes = mergeServiceNote(existing, body.serviceNote, body.serviceNoteAppend);
    const profRes = await patchReceivingAppealProfileCas(appealId, {
      privateNotes,
      expectedRevision: revision,
    });
    if (!profRes.ok) {
      return {
        appealId,
        ok: false,
        reason: profRes.code === "CONFLICT" ? "version_conflict" : profRes.code,
        message: profRes.message,
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
    outcomes.push(await applyOneIntent(intent, byId.get(intent.appealId)));
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
