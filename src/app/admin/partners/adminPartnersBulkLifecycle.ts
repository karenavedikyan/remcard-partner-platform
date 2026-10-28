import type { BulkLifecycleAction } from "@/app/admin/partners/adminPartnersRegistryConstants";
import { BULK_APPLY_CONCURRENCY } from "@/app/admin/partners/adminPartnersRegistryConstants";
import { RemcardApiError } from "@/lib/api-client";

export type BulkPreviewMember = {
  userId: string;
  displayName: string | null;
  confirmToken: string;
  effects: string[];
  warnings: string[];
};

export type BulkPreviewSnapshot = {
  action: BulkLifecycleAction;
  reason: string;
  members: BulkPreviewMember[];
  /** Bumps when selection/reason/action changes invalidate the snapshot. */
  revision: number;
};

export type BulkPreviewFailure = {
  userId: string;
  displayName: string | null;
  message: string;
};

export type BulkApplyOutcome = "success" | "error" | "unknown" | "stopped";

export type BulkApplyRowResult = {
  userId: string;
  displayName: string | null;
  outcome: BulkApplyOutcome;
  message?: string;
};

export function classifyBulkApplyError(error: unknown): BulkApplyOutcome {
  if (error instanceof RemcardApiError) {
    if (error.status === 0) return "unknown";
    if (error.status >= 500) return "unknown";
    if (error.message === "Некорректный ответ сервера") return "unknown";
    if (error.status >= 400 && error.status < 500) return "error";
    return "unknown";
  }
  return "unknown";
}

export async function fetchBulkPreviews(
  members: readonly { userId: string; displayName: string | null }[],
  action: BulkLifecycleAction,
  previewFn: (
    userId: string,
    action: BulkLifecycleAction,
  ) => Promise<{
    preview: {
      effects: string[];
      warnings: string[];
      displayName: string | null;
      confirmToken: string;
    };
  }>,
): Promise<
  | { ok: BulkPreviewMember[] }
  | { failures: BulkPreviewFailure[]; partial: BulkPreviewMember[] }
> {
  const partial: BulkPreviewMember[] = [];
  const failures: BulkPreviewFailure[] = [];

  for (const member of members) {
    try {
      const preview = await previewFn(member.userId, action);
      partial.push({
        userId: member.userId,
        displayName: preview.preview.displayName ?? member.displayName,
        confirmToken: preview.preview.confirmToken,
        effects: preview.preview.effects,
        warnings: preview.preview.warnings,
      });
    } catch (e) {
      failures.push({
        userId: member.userId,
        displayName: member.displayName,
        message: e instanceof Error ? e.message : "Не удалось получить preview",
      });
    }
  }

  if (failures.length > 0) {
    return { failures, partial };
  }
  return { ok: partial };
}

export function bulkSnapshotMatches(
  snapshot: BulkPreviewSnapshot,
  action: BulkLifecycleAction,
  reason: string,
  memberIds: readonly string[],
): boolean {
  if (snapshot.action !== action || snapshot.reason.trim() !== reason.trim()) return false;
  if (snapshot.members.length !== memberIds.length) return false;
  const ids = new Set(memberIds);
  for (const m of snapshot.members) {
    if (!ids.has(m.userId)) return false;
  }
  return true;
}

export async function runBulkApplyQueue(options: {
  snapshot: BulkPreviewSnapshot;
  applyFn: (
    userId: string,
    action: BulkLifecycleAction,
    reason: string,
    confirmToken: string,
  ) => Promise<unknown>;
  concurrency?: number;
  shouldStop: () => boolean;
  onRowStart: (userId: string) => void;
  onRowDone: (result: BulkApplyRowResult) => void;
}): Promise<BulkApplyRowResult[]> {
  const {
    snapshot,
    applyFn,
    concurrency = BULK_APPLY_CONCURRENCY,
    shouldStop,
    onRowStart,
    onRowDone,
  } = options;
  const results: BulkApplyRowResult[] = [];
  const queue = [...snapshot.members];
  let inFlight = 0;
  let index = 0;
  let settled = false;

  return new Promise((resolve) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(results);
    };

    const markStoppedRemaining = () => {
      while (index < queue.length) {
        const member = queue[index++];
        const row: BulkApplyRowResult = {
          userId: member.userId,
          displayName: member.displayName,
          outcome: "stopped",
          message: "Остановлено до отправки",
        };
        results.push(row);
        onRowDone(row);
      }
    };

    const pump = () => {
      if (settled) return;

      if (shouldStop() && inFlight === 0) {
        markStoppedRemaining();
        finish();
        return;
      }

      while (!shouldStop() && inFlight < concurrency && index < queue.length) {
        const member = queue[index++];
        inFlight += 1;
        onRowStart(member.userId);
        void applyFn(member.userId, snapshot.action, snapshot.reason.trim(), member.confirmToken)
          .then(() => {
            const row: BulkApplyRowResult = {
              userId: member.userId,
              displayName: member.displayName,
              outcome: "success",
            };
            results.push(row);
            onRowDone(row);
          })
          .catch((e) => {
            const outcome = classifyBulkApplyError(e);
            const row: BulkApplyRowResult = {
              userId: member.userId,
              displayName: member.displayName,
              outcome,
              message: e instanceof Error ? e.message : "Ошибка применения",
            };
            results.push(row);
            onRowDone(row);
          })
          .finally(() => {
            inFlight -= 1;
            if (index >= queue.length && inFlight === 0) {
              finish();
              return;
            }
            pump();
          });
      }

      if (index >= queue.length && inFlight === 0) {
        finish();
      }
    };

    pump();
  });
}
