/**
 * K5 wire adapter — navigator @ 86ac3e35:
 * PATCH /api/pro/referred-appeals/:id/personal-meta
 * POST  /api/pro/referred-appeals/personal-batch
 */
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ObserverPersonalBucket, ObserverPersonalMeta } from "@/lib/clients-parity/types";
import type {
  ObserverPersonalPersistResult,
  ObserverPersonalPersistenceCallbacks,
} from "@/components/clients/observer/ObserverPartnersListView";
import type { PersonalEditDraft } from "@/components/clients/observer/ObserverPersonalEditPanel";

export const OBSERVER_PERSONAL_META_PATH = "/api/pro/referred-appeals";
export const OBSERVER_PERSONAL_BATCH_PATH = "/api/pro/referred-appeals/personal-batch";

type PersonalMetaProjection = {
  appealId: string;
  alias: string | null;
  tag: string | null;
  note: string | null;
  bucket: ObserverPersonalBucket;
  version: number;
  updatedAt: string;
};

type PersonalBatchSkipped = { appealId: string; reason: string };

function isBffPathBlocked(error: RemcardApiError): boolean {
  const text = `${error.body?.error ?? ""} ${error.message}`.toLowerCase();
  return text.includes("path not allowed") || text.includes("invalid path");
}

function projectionToMeta(row: PersonalMetaProjection): ObserverPersonalMeta {
  return {
    alias: row.alias ?? undefined,
    tag: row.tag ?? undefined,
    note: row.note ?? undefined,
    bucket: row.bucket,
  };
}

function buildMetaMap(rows: PersonalMetaProjection[]): Record<string, ObserverPersonalMeta> {
  const out: Record<string, ObserverPersonalMeta> = {};
  for (const row of rows) {
    out[row.appealId] = projectionToMeta(row);
  }
  return out;
}

function bucketToMoveTarget(bucket: ObserverPersonalBucket): "archived" | "trash" | null {
  if (bucket === "archived") return "archived";
  if (bucket === "trash") return "trash";
  return null;
}

export function createObserverPersonalPersistenceCallbacks(
  getExpectedVersions: () => Record<string, number>,
  onVersionsPatched: (versions: Record<string, number>) => void,
): ObserverPersonalPersistenceCallbacks {
  return {
    onSavePersonal: async ({ mode, ids, draft }) => {
      if (mode === "bulk") {
        const expectedVersions = Object.fromEntries(
          ids.map((id) => [id, getExpectedVersions()[id] ?? 0]),
        );
        try {
          const body = await remcardFetch<{
            processed: PersonalMetaProjection[];
            skipped: PersonalBatchSkipped[];
          }>(OBSERVER_PERSONAL_BATCH_PATH, {
            method: "POST",
            requireCsrf: true,
            body: {
              action: "setTag",
              ids,
              tag: draft.tag,
              mode: "best_effort",
              expectedVersions,
            },
          });
          const meta = buildMetaMap(body.processed ?? []);
          const versions: Record<string, number> = {};
          for (const row of body.processed ?? []) {
            versions[row.appealId] = row.version;
          }
          onVersionsPatched(versions);
          const failedIds = (body.skipped ?? []).map((s) => s.appealId);
          return { ok: true, meta, failedIds: failedIds.length ? failedIds : undefined };
        } catch (error) {
          return mapMutationError(error);
        }
      }

      const id = ids[0];
      if (!id) return { ok: false, message: "Не выбрана запись." };
      try {
        const body = await remcardFetch<{ meta: PersonalMetaProjection }>(
          `${OBSERVER_PERSONAL_META_PATH}/${encodeURIComponent(id)}/personal-meta`,
          {
            method: "PATCH",
            requireCsrf: true,
            body: {
              expectedVersion: getExpectedVersions()[id] ?? 0,
              alias: draft.alias || null,
              tag: draft.tag || null,
              note: draft.note || null,
            },
          },
        );
        const meta = { [id]: projectionToMeta(body.meta) };
        onVersionsPatched({ [id]: body.meta.version });
        return { ok: true, meta };
      } catch (error) {
        return mapMutationError(error);
      }
    },

    onBucketAction: async ({ action, ids }) => {
      const expectedVersions = Object.fromEntries(
        ids.map((id) => [id, getExpectedVersions()[id] ?? 0]),
      );
      try {
        if (action === "restore") {
          const body = await remcardFetch<{
            processed: PersonalMetaProjection[];
            skipped: PersonalBatchSkipped[];
          }>(OBSERVER_PERSONAL_BATCH_PATH, {
            method: "POST",
            requireCsrf: true,
            body: {
              action: "restore",
              ids,
              mode: "best_effort",
              expectedVersions,
            },
          });
          const meta = buildMetaMap(body.processed ?? []);
          onVersionsPatched(
            Object.fromEntries((body.processed ?? []).map((p) => [p.appealId, p.version])),
          );
          const failedIds = (body.skipped ?? []).map((s) => s.appealId);
          return { ok: true, meta, failedIds: failedIds.length ? failedIds : undefined };
        }

        const target = bucketToMoveTarget(action === "archived" ? "archived" : "trash");
        if (!target) {
          return { ok: false, message: "Неизвестное действие с корзиной." };
        }
        const body = await remcardFetch<{
          processed: PersonalMetaProjection[];
          skipped: PersonalBatchSkipped[];
        }>(OBSERVER_PERSONAL_BATCH_PATH, {
          method: "POST",
          requireCsrf: true,
          body: {
            action: "move",
            ids,
            target,
            mode: "best_effort",
            expectedVersions,
          },
        });
        const meta = buildMetaMap(body.processed ?? []);
        onVersionsPatched(
          Object.fromEntries((body.processed ?? []).map((p) => [p.appealId, p.version])),
        );
        const failedIds = (body.skipped ?? []).map((s) => s.appealId);
        return { ok: true, meta, failedIds: failedIds.length ? failedIds : undefined };
      } catch (error) {
        return mapMutationError(error);
      }
    },
  };
}

function mapMutationError(error: unknown): ObserverPersonalPersistResult {
  if (error instanceof RemcardApiError) {
    if (isBffPathBlocked(error)) {
      return {
        ok: false,
        message:
          "BLOCKED_PERSISTENCE: маршрут personal-meta недоступен через прокси (ожидается P1 allowlist + K5).",
      };
    }
    const code = error.body?.code;
    if (error.status === 401) {
      return { ok: false, message: "Требуется вход в кабинет." };
    }
    if (error.status === 403) {
      return { ok: false, message: code ? `Нет доступа (${code}).` : "Нет доступа." };
    }
    if (error.status === 404) {
      return { ok: false, message: "Запись не найдена или недоступна." };
    }
    if (error.status === 409 || code === "VERSION_CONFLICT") {
      return { ok: false, message: "Данные изменились на сервере. Обновите список и повторите." };
    }
    if (error.status === 503 || code === "PERSISTENCE_UNAVAILABLE") {
      return {
        ok: false,
        message: "Сохранение личных полей недоступно (схема не развёрнута).",
      };
    }
    return { ok: false, message: error.message || "Ошибка сохранения." };
  }
  return { ok: false, message: "Сетевая ошибка при сохранении." };
}
