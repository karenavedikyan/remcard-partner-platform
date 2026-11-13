import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";
import type { ReceivingBatchFailure, ReceivingPerIdBulkApplyResult } from "./receiving-bulk-contract";
import {
  RECEIVING_SYSTEM_STAGE,
  fetchReceivingAppealDetailWire,
  type ReceivingAppealListRow,
  type ReceivingAppealProfilePatchWire,
  type ReceivingAppealStagePatchWire,
  type ReceivingWorkingStage,
} from "./receiving-appeals-api";

export type ReceivingBulkEditDraft = {
  stageKey?: string;
  privateNotes?: string;
  noteAppend?: boolean;
};

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

type PatchOneResult =
  | { ok: true; revision?: string | number }
  | { ok: false; code: "CONFLICT" | "BLOCKED_CONTRACT" | "ERROR"; message: string };

async function patchProfileOne(
  id: string,
  body: ReceivingAppealProfilePatchWire,
): Promise<PatchOneResult> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isAllowedProxyRoute("PATCH", path)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: "PATCH profile ждёт P1 allowlist." };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    return { ok: true };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 409) {
      return { ok: false, code: "CONFLICT", message: caught.message };
    }
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "PATCH profile failed",
    };
  }
}

async function patchStageOne(
  id: string,
  body: ReceivingAppealStagePatchWire,
): Promise<PatchOneResult> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}/stage`;
  if (!isAllowedProxyRoute("PATCH", path)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: "PATCH stage ждёт P1 allowlist." };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    return { ok: true };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 409) {
      return { ok: false, code: "CONFLICT", message: caught.message };
    }
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "PATCH stage failed",
    };
  }
}

export function isReceivingBulkPatchProxyReady(): boolean {
  return (
    isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/x") ||
    isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/x/stage")
  );
}

/** Serial per-id PATCH (K1 CAS) — no invented batch PATCH body. */
export async function applyReceivingBulkEditsPerId(
  ids: string[],
  draft: ReceivingBulkEditDraft,
  ctx: {
    appeals: ReceivingAppealListRow[];
    workingStages: ReceivingWorkingStage[];
  },
): Promise<ReceivingPerIdBulkApplyResult> {
  const updatedIds: string[] = [];
  const skippedIds: string[] = [];
  const failures: ReceivingBatchFailure[] = [];
  const stageKey = draft.stageKey?.trim() || "";
  const note = draft.privateNotes?.trim() || "";
  const noteAppend = draft.noteAppend !== false;

  if (!stageKey && !note) {
    return {
      updatedIds: [],
      skippedIds: ids,
      failures: ids.map((id) => ({ id, reason: "validation", message: "Пустое изменение." })),
    };
  }

  for (const id of ids) {
    const row = ctx.appeals.find((a) => a.id === id);
    if (!row) {
      failures.push({ id, reason: "not_found", message: "Обращение не в текущем списке." });
      continue;
    }

    const detail = await fetchReceivingAppealDetailWire(id);
    if (!detail.ok) {
      failures.push({
        id,
        code: detail.code,
        reason: detail.code,
        message: detail.message,
      });
      continue;
    }

    let revision = detail.wire.revision;
    let touched = false;
    let failed = false;

    if (
      stageKey &&
      !isReceivingFinancialStageKey(stageKey) &&
      stageKey !== RECEIVING_SYSTEM_STAGE.REFUSED &&
      !isReceivingAppealLockedForBulkStage(row) &&
      row.stageId !== stageKey
    ) {
      const stageRes = await patchStageOne(id, { stageKey, expectedRevision: revision });
      if (!stageRes.ok) {
        failures.push({
          id,
          code: stageRes.code,
          reason: stageRes.code === "CONFLICT" ? "version_conflict" : stageRes.code,
          message: stageRes.message,
        });
        failed = true;
      } else {
        touched = true;
        const refreshed = await fetchReceivingAppealDetailWire(id);
        if (refreshed.ok) revision = refreshed.wire.revision;
      }
    }

    if (!failed && note) {
      const existing = detail.wire.appeal.privateNotes?.trim() ?? "";
      const piece = note.slice(0, 2000);
      const privateNotes = noteAppend
        ? [existing, piece].filter(Boolean).join("\n").slice(0, 4000)
        : piece;
      const profRes = await patchProfileOne(id, { privateNotes, expectedRevision: revision });
      if (!profRes.ok) {
        failures.push({
          id,
          code: profRes.code,
          reason: profRes.code === "CONFLICT" ? "version_conflict" : profRes.code,
          message: profRes.message,
        });
        failed = true;
      } else {
        touched = true;
      }
    }

    if (failed) {
      skippedIds.push(id);
    } else if (touched) {
      updatedIds.push(id);
    } else {
      skippedIds.push(id);
    }
  }

  return { updatedIds, skippedIds, failures };
}
