"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  findDuplicateRefusalReasonLabel,
  findDuplicateWorkingStageLabel,
  isReceivingWorkingStagesPostReady,
  postReceivingWorkingStagesMutation,
  type ReceivingPartnerSettings,
  type ReceivingPartnerSettingsSnapshot,
  type ReceivingWorkingStage,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingIcon } from "./ReceivingIcons";
import { ReceivingSubpageHead } from "./ReceivingSubpageHead";
import { stageBadgeClassName } from "./receiving-display";
import styles from "./receiving.module.css";

/** Prototype `renderSettingsInline` — persisted via POST working-stages. */
export type WorkingStagesEditorProps = {
  settings: ReceivingPartnerSettings;
  settingsVersion?: string | number;
  disabled?: boolean;
  onCancel?: () => void;
  onSettingsUpdated?: (snapshot: ReceivingPartnerSettingsSnapshot) => void;
  onRefetchSettings?: () => Promise<void>;
};

const LOCKED_STAGES = [
  { id: "sys_new", label: "Новое обращение" },
  { id: "sys_paid", label: "Оплачено" },
  { id: "sys_shipped", label: "Отгружено" },
  { id: "sys_return", label: "Возврат" },
];

const SAVED_FEEDBACK_MS = 2000;

export const WORKING_STAGES_SUBTITLE = "Настройте путь клиента под свой бизнес. Изменения видны только вам.";

function cloneSettings(settings: ReceivingPartnerSettings): ReceivingPartnerSettings {
  return {
    ...settings,
    workingStages: settings.workingStages.map((s) => ({ ...s })),
    refusalReasons: [...settings.refusalReasons],
    archivedStages: settings.archivedStages.map((s) => ({ ...s })),
    manualChannels: settings.manualChannels ? [...settings.manualChannels] : [],
  };
}

function sameSettings(a: ReceivingPartnerSettings, b: ReceivingPartnerSettings): boolean {
  const sameStages = (x: ReceivingWorkingStage[], y: ReceivingWorkingStage[]) =>
    x.length === y.length && x.every((s, i) => s.id === y[i]!.id && s.label === y[i]!.label);
  return (
    sameStages(a.workingStages, b.workingStages) &&
    sameStages(a.archivedStages, b.archivedStages) &&
    a.refusalReasons.length === b.refusalReasons.length &&
    a.refusalReasons.every((r, i) => r === b.refusalReasons[i])
  );
}

export function WorkingStagesEditor({
  settings,
  settingsVersion,
  disabled = false,
  onCancel,
  onSettingsUpdated,
  onRefetchSettings,
}: WorkingStagesEditorProps) {
  const [draft, setDraft] = useState(() => cloneSettings(settings));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(settingsVersion);
  const [baseline, setBaseline] = useState(() => cloneSettings(settings));
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const proxyReady = isReceivingWorkingStagesPostReady();
  const mutationsDisabled = disabled || !proxyReady || pending;

  const dirty = useMemo(() => !sameSettings(draft, baseline), [draft, baseline]);

  const clearSavedFeedback = useCallback(() => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = null;
    setJustSaved(false);
  }, []);

  useEffect(() => {
    setDraft(cloneSettings(settings));
    setBaseline(cloneSettings(settings));
    setVersion(settingsVersion);
  }, [settings, settingsVersion]);

  useEffect(() => {
    if (dirty) clearSavedFeedback();
  }, [dirty, clearSavedFeedback]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const applySnapshot = useCallback(
    (snapshot: ReceivingPartnerSettingsSnapshot) => {
      setDraft(cloneSettings(snapshot.settings));
      setBaseline(cloneSettings(snapshot.settings));
      setVersion(snapshot.version);
      onSettingsUpdated?.(snapshot);
    },
    [onSettingsUpdated],
  );

  const runMutation = useCallback(
    async (
      body: Parameters<typeof postReceivingWorkingStagesMutation>[0],
      onSuccess?: () => void,
    ) => {
      setError(null);
      clearSavedFeedback();
      if (mutationsDisabled) {
        setError("Сохранение настроек ждёт P1 allowlist и K1 POST working-stages.");
        return;
      }
      setPending(true);
      const res = await postReceivingWorkingStagesMutation({
        ...body,
        expectedVersion: body.expectedVersion ?? version,
      });
      setPending(false);
      if (!res.ok) {
        if (res.code === "CONFLICT") {
          setError(`${res.message} Обновите настройки и повторите.`);
          await onRefetchSettings?.();
        } else {
          setError(res.message);
        }
        return;
      }
      applySnapshot(res.snapshot);
      onSuccess?.();
    },
    [applySnapshot, clearSavedFeedback, mutationsDisabled, onRefetchSettings, version],
  );

  const stageRows = useMemo(() => draft.workingStages, [draft.workingStages]);

  const saveDraft = async () => {
    const labels = stageRows.map((s) => s.label.trim());
    const reasons = draft.refusalReasons.map((r) => r.trim());
    if (labels.some((l) => !l) || reasons.some((r) => !r)) {
      setError("Заполните названия этапов и причин отказа.");
      return;
    }
    const seen = new Set<string>();
    for (const label of labels) {
      const key = label.toLowerCase();
      if (seen.has(key)) {
        setError("Такой этап уже есть.");
        return;
      }
      seen.add(key);
    }
    await runMutation(
      {
        kind: "saveSettings",
        workingStages: stageRows.map((s, i) => ({ ...s, label: labels[i]! })),
        refusalReasons: reasons,
        archivedStages: draft.archivedStages,
      },
      () => {
        setJustSaved(true);
        savedTimer.current = setTimeout(clearSavedFeedback, SAVED_FEEDBACK_MS);
      },
    );
  };

  return (
    <section
      className={`stack ca-section ${styles.receivingShell}`}
      data-testid="ca-receiving-working-stages-editor"
      aria-label="Этапы и причины"
    >
      <ReceivingSubpageHead
        onBack={onCancel ?? (() => undefined)}
        title="Этапы и причины"
        subtitle={WORKING_STAGES_SUBTITLE}
        subtitleTestId="ca-receiving-settings-subtitle"
      />
      <div className="ca-settings-grid">
        <section className="panel stack">
          <h3>Этапы работы</h3>
          <div className="ca-locked-chips" data-testid="ca-locked-system-stages">
            {LOCKED_STAGES.map((stage, index) => (
              <span key={stage.id}>
                {index > 0 ? <span aria-hidden="true">{index === 1 ? "…" : "→"}</span> : null}
                <span className={stageBadgeClassName(stage.id, stage.label)}>{stage.label}</span>
              </span>
            ))}
          </div>
          <div className="stack" id="ca-stage-list">
            {stageRows.length === 0 ? (
              <p className="muted small">Пользовательских этапов пока нет — добавьте первый.</p>
            ) : (
              stageRows.map((stage, index) => (
                <div className="ca-stage-row" key={stage.id}>
                  <button
                    type="button"
                    className="btn ghost icon-btn"
                    aria-label="Выше"
                    disabled={mutationsDisabled || index === 0}
                    onClick={() =>
                      void runMutation({
                        kind: "moveWorkingStage",
                        stageId: stage.id,
                        direction: "up",
                      })
                    }
                  >
                    <ReceivingIcon name="chevron-up" />
                  </button>
                  <button
                    type="button"
                    className="btn ghost icon-btn"
                    aria-label="Ниже"
                    disabled={mutationsDisabled || index === stageRows.length - 1}
                    onClick={() =>
                      void runMutation({
                        kind: "moveWorkingStage",
                        stageId: stage.id,
                        direction: "down",
                      })
                    }
                  >
                    <ReceivingIcon name="chevron-down" />
                  </button>
                  <input
                    type="text"
                    className="stage-label"
                    aria-label={`Этап ${index + 1}`}
                    value={stage.label}
                    disabled={mutationsDisabled}
                    onChange={(e) => {
                      const next = cloneSettings(draft);
                      next.workingStages[index] = { ...stage, label: e.target.value };
                      setDraft(next);
                    }}
                    onBlur={(e) => {
                      const trimmed = e.target.value.trim();
                      if (!trimmed || trimmed === stage.label.trim()) return;
                      const dupe = findDuplicateWorkingStageLabel(trimmed, stageRows);
                      if (dupe && dupe.id !== stage.id) {
                        setError("Такой этап уже есть.");
                        return;
                      }
                      void runMutation({
                        kind: "renameWorkingStage",
                        stageId: stage.id,
                        label: trimmed,
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="btn ghost icon-btn"
                    aria-label="В архив"
                    disabled={mutationsDisabled}
                    onClick={() =>
                      void runMutation({ kind: "archiveWorkingStage", stageId: stage.id })
                    }
                  >
                    <ReceivingIcon name="archive" />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            className="btn ghost small-btn ca-settings-add"
            data-testid="ca-settings-add-stage"
            disabled={mutationsDisabled}
            onClick={() => {
              setError(null);
              setDraft((prev) => ({
                ...prev,
                workingStages: [
                  ...prev.workingStages,
                  { id: `ws_draft_${Date.now()}`, label: "" },
                ],
              }));
            }}
          >
            <ReceivingIcon name="plus" /> Добавить этап
          </button>
        </section>

        <section className="panel stack" data-testid="ca-refusal-reasons">
          <h3>Причины отказа</h3>
          {draft.refusalReasons.length === 0 ? (
            <p className="muted small">Список пуст — добавьте причину.</p>
          ) : (
            draft.refusalReasons.map((reason, index) => {
              const savedLabel = settings.refusalReasons[index];
              return (
                <div className="ca-stage-row" key={index}>
                  <input
                    type="text"
                    className="reason-label"
                    value={reason}
                    disabled={mutationsDisabled}
                    onChange={(e) => {
                      const next = cloneSettings(draft);
                      next.refusalReasons[index] = e.target.value;
                      setDraft(next);
                    }}
                    onBlur={(e) => {
                      if (savedLabel === undefined) return;
                      const trimmed = e.target.value.trim();
                      if (!trimmed || trimmed === savedLabel.trim()) return;
                      const dupe = findDuplicateRefusalReasonLabel(
                        trimmed,
                        draft.refusalReasons.filter((_, i) => i !== index),
                      );
                      if (dupe) {
                        setError("Такая причина уже есть.");
                        return;
                      }
                      void runMutation({
                        kind: "renameRefusalReason",
                        previousLabel: savedLabel,
                        label: trimmed,
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="btn ghost icon-btn"
                    aria-label={`Убрать причину: ${reason || index + 1}`}
                    disabled={mutationsDisabled}
                    onClick={() => {
                      if (savedLabel === undefined) {
                        setDraft((prev) => ({
                          ...prev,
                          refusalReasons: prev.refusalReasons.filter((_, i) => i !== index),
                        }));
                        return;
                      }
                      void runMutation({ kind: "removeRefusalReason", label: savedLabel });
                    }}
                  >
                    <ReceivingIcon name="archive" />
                  </button>
                </div>
              );
            })
          )}
          <button
            type="button"
            className="btn ghost small-btn ca-settings-add"
            data-testid="ca-settings-add-reason"
            disabled={mutationsDisabled}
            onClick={() =>
              setDraft((prev) => ({ ...prev, refusalReasons: [...prev.refusalReasons, ""] }))
            }
          >
            <ReceivingIcon name="plus" /> Добавить причину
          </button>

          {draft.archivedStages.length > 0 ? (
            <details className="ca-archive" data-testid="ca-archived-stages" open>
              <summary>Архив ({draft.archivedStages.length})</summary>
              <ul className="stack">
                {draft.archivedStages.map((stage) => (
                  <li className="row" key={stage.id}>
                    <span>{stage.label}</span>
                    <button
                      type="button"
                      className="btn ghost small-btn"
                      disabled={mutationsDisabled}
                      onClick={() =>
                        void runMutation({ kind: "restoreWorkingStage", stageId: stage.id })
                      }
                    >
                      Вернуть
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>

      {!proxyReady ? (
        <p className={styles.receivingNotice} role="status" data-testid="ca-settings-blocked">
          POST working-stages ещё не в P1 allowlist — правки не отправляются на сервер.
        </p>
      ) : null}

      {error ? (
        <p className="field-error" role="alert" data-testid="ca-settings-error">
          {error}
        </p>
      ) : null}

      <div className="ca-settings-footer panel ca-form-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={mutationsDisabled || !dirty}
          onClick={() => {
            setDraft(cloneSettings(settings));
            setError(null);
          }}
        >
          Отменить изменения
        </button>
        <button
          type="button"
          className={`btn primary ca-save-btn${justSaved ? " is-saved" : ""}`}
          disabled={mutationsDisabled || !dirty}
          data-testid="ca-settings-save"
          onClick={() => void saveDraft()}
        >
          {pending ? (
            "Сохранение…"
          ) : justSaved ? (
            <>
              <svg
                data-testid="ca-settings-saved-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Сохранено
            </>
          ) : (
            "Сохранить"
          )}
        </button>
        <span className="sr-only" aria-live="polite" data-testid="ca-settings-save-status">
          {justSaved ? "Настройки сохранены" : ""}
        </span>
      </div>
    </section>
  );
}
