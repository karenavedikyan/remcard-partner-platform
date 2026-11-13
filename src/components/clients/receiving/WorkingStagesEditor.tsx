"use client";

import {
  isReceivingSettingsMaterialized,
  type ReceivingPartnerSettings,
  type ReceivingWorkingStage,
} from "@/lib/clients-parity/receiving-appeals-api";
import styles from "./receiving.module.css";

/** prototype renderSettingsInline — persisted via POST working-stages. */
export type WorkingStagesEditorProps = {
  settings: ReceivingPartnerSettings;
  disabled?: boolean;
  onSave?: (next: ReceivingPartnerSettings) => void | Promise<void>;
  onCancel?: () => void;
};

function StageList({
  title,
  items,
  archived,
}: {
  title: string;
  items: ReceivingWorkingStage[];
  archived?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="panel stack" data-testid={archived ? "ca-archived-stages" : "ca-working-stages"}>
      <h3>{title}</h3>
      <ul className="stack-tight">
        {items.map((s) => (
          <li key={s.id}>
            <span className="pill">{s.label}</span>
            <span className="small muted"> ({s.id})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkingStagesEditor({
  settings,
  disabled = true,
  onSave,
  onCancel,
}: WorkingStagesEditorProps) {
  const materialized = isReceivingSettingsMaterialized(settings);

  return (
    <section
      className={`stack ca-section ${styles.receivingShell}`}
      data-testid="ca-receiving-working-stages-editor"
      aria-label="Этапы и причины"
    >
      {!materialized ? (
        <p className={styles.receivingNotice} role="status">
          Этапы и причины отсутствуют на сервере — нужен <strong>K8 settings storage</strong>, не
          локальные константы.
        </p>
      ) : null}
      <StageList title="Рабочие этапы" items={settings.workingStages} />
      <section className="panel stack" data-testid="ca-refusal-reasons">
        <h3>Причины отказа</h3>
        {settings.refusalReasons.length === 0 ? (
          <p className="muted">Список пуст.</p>
        ) : (
          <ul className="stack-tight">
            {settings.refusalReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </section>
      <StageList title="Архив этапов" items={settings.archivedStages} archived />
      <div className="ca-form-actions">
        {onCancel ? (
          <button type="button" className="btn ghost" data-ca-action="nav:list" onClick={onCancel}>
            К списку
          </button>
        ) : null}
        <button
          type="button"
          className="btn primary"
          disabled={disabled || !onSave || !materialized}
          onClick={() => onSave?.(settings)}
        >
          Сохранить
        </button>
      </div>
    </section>
  );
}
