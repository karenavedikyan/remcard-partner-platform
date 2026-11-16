"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const proxyReady = isReceivingWorkingStagesPostReady();
  const mutationsDisabled = disabled || !proxyReady || pending;

  useEffect(() => {
    setDraft(cloneSettings(settings));
    setVersion(settingsVersion);
  }, [settings, settingsVersion]);

  const applySnapshot = useCallback(
    (snapshot: ReceivingPartnerSettingsSnapshot) => {
      setDraft(cloneSettings(snapshot.settings));
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
    [applySnapshot, mutationsDisabled, onRefetchSettings, version],
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
    await runMutation({
      kind: "saveSettings",
      workingStages: stageRows.map((s, i) => ({ ...s, label: labels[i]! })),
      refusalReasons: reasons,
      archivedStages: draft.archivedStages,
    });
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
            draft.refusalReasons.map((reason, index) => (
              <div className="ca-stage-row" key={`${index}-${reason}`}>
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
                    const trimmed = e.target.value.trim();
                    if (!trimmed || trimmed === reason.trim()) return;
                    const dupe = findDuplicateRefusalReasonLabel(trimmed, draft.refusalReasons);
                    if (dupe && dupe.toLowerCase() !== reason.trim().toLowerCase()) {
                      setError("Такая причина уже есть.");
                      return;
                    }
                    void runMutation({
                      kind: "renameRefusalReason",
                      previousLabel: reason,
                      label: trimmed,
                    });
                  }}
                />
                <button
                  type="button"
                  className="btn ghost icon-btn"
                  aria-label={`Убрать причину: ${reason || index + 1}`}
                  disabled={mutationsDisabled}
                  onClick={() =>
                    void runMutation({ kind: "removeRefusalReason", label: reason })
                  }
                >
                  <ReceivingIcon name="archive" />
                </button>
              </div>
            ))
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
          disabled={mutationsDisabled}
          onClick={() => {
            setDraft(cloneSettings(settings));
            setError(null);
          }}
        >
          Отменить изменения
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={mutationsDisabled}
          data-testid="ca-settings-save"
          onClick={() => void saveDraft()}
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </section>
  );
}
