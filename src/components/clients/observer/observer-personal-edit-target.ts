import type { PersonalEditDraft } from "./ObserverPersonalEditPanel";

/** Stable panel identity for P3 state (ListView does not import drafts from server on every render). */
export function buildObserverEditTargetKey(mode: "single" | "bulk", appealIds: readonly string[]): string {
  return `${mode}:${[...appealIds].sort().join(",")}`;
}

export function buildObserverConfirmTargetKey(
  kind: "archived" | "trash" | "restore",
  appealIds: readonly string[],
): string {
  return `${kind}:${[...appealIds].sort().join(",")}`;
}

/** P3 panel state — bump `draftSeed` on cancel/reopen; keep stable across pending/error. */
export type ObserverPersonalEditPanelBinding = {
  editTargetKey: string;
  mode: "single" | "bulk";
  count: number;
  initial?: PersonalEditDraft;
  /** Increment when reopening edit for same ids after cancel (reload server `initial`). */
  draftSeed?: number | string;
  persistenceStatus: import("./ObserverPersonalEditPanel").ObserverPersonalPersistenceStatus;
  saveError?: string | null;
};

/**
 * P3 rules:
 * - `draftSeed` unchanged while status cycles ready→pending→error (draft kept in panel).
 * - Change `editTargetKey` or `draftSeed` to reinitialize fields from `initial`.
 * - React `key={editTargetKey}` on panel; during `pending`, ignore target switches (remount only).
 */
