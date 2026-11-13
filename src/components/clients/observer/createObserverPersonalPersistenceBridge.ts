/**
 * П3 workspace bridge → П5 `observer-personal-api.ts` (K5 wire). Do not duplicate mutation logic here.
 */
import {
  applyObserverPersonalEdit,
  mapProjectionToPartnerMeta,
  personalMutationErrorMessage,
  personalMutationFailedIds,
  runObserverPersonalConfirmAction,
  type PersonalMutationResult,
} from "@/lib/clients-parity/observer-personal-api";
import type { ObserverPersonalMeta } from "@/lib/clients-parity/types";
import type { PersonalEditDraft } from "./ObserverPersonalEditPanel";
import type {
  ObserverPersonalPersistResult,
  ObserverPersonalPersistenceCallbacks,
} from "./ObserverPartnersListView";

function toPersistResult(result: PersonalMutationResult): ObserverPersonalPersistResult {
  if (result.ok) {
    const meta =
      result.metaById ??
      (result.projections
        ? Object.fromEntries(
            Object.entries(result.projections).map(([id, row]) => [
              id,
              mapProjectionToPartnerMeta(row),
            ]),
          )
        : {});
    const failedIds = personalMutationFailedIds(result);
    return {
      ok: true,
      meta,
      failedIds: failedIds.length ? failedIds : undefined,
    };
  }
  const message =
    personalMutationErrorMessage(result) ??
    (result.kind === "blocked_contract" ? result.message : "Ошибка сохранения.");
  const failedIds = personalMutationFailedIds(result);
  return {
    ok: false,
    message,
    failedIds: failedIds.length ? failedIds : undefined,
  };
}

function versionsFromResult(result: PersonalMutationResult): Record<string, number> {
  if (!result.ok || !result.projections) return {};
  const out: Record<string, number> = {};
  for (const [id, row] of Object.entries(result.projections)) {
    out[id] = row.version;
  }
  return out;
}

export function createObserverPersonalPersistenceBridge(
  getExpectedVersions: () => Record<string, number>,
  onVersionsPatched: (versions: Record<string, number>) => void,
): ObserverPersonalPersistenceCallbacks {
  const bumpVersions = (result: PersonalMutationResult) => {
    const patch = versionsFromResult(result);
    if (Object.keys(patch).length) onVersionsPatched(patch);
  };

  return {
    onSavePersonal: async ({ mode, ids, draft }) => {
      const expectedVersions = Object.fromEntries(
        ids.map((id) => [id, getExpectedVersions()[id] ?? 0]),
      );
      const result = await applyObserverPersonalEdit(mode, ids, draft, {
        expectedVersion: mode === "single" ? getExpectedVersions()[ids[0]!] ?? 0 : undefined,
        expectedVersions: mode === "bulk" ? expectedVersions : undefined,
      });
      bumpVersions(result);
      return toPersistResult(result);
    },

    onBucketAction: async ({ action, ids }) => {
      const expectedVersions = Object.fromEntries(
        ids.map((id) => [id, getExpectedVersions()[id] ?? 0]),
      );
      const result = await runObserverPersonalConfirmAction(action, ids, { expectedVersions });
      bumpVersions(result);
      return toPersistResult(result);
    },
  };
}
