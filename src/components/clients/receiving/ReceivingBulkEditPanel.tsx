"use client";

import { useMemo, useState } from "react";
import {
  RECEIVING_SYSTEM_STAGE,
  type ReceivingAppealListRow,
  type ReceivingWorkingStage,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  isReceivingAppealLockedForBulkStage,
  isReceivingFinancialStageKey,
  type ReceivingBulkEditDraft,
} from "@/lib/clients-parity/receiving-bulk-apply";
import styles from "./receiving.module.css";

export type ReceivingBulkEditPanelProps = {
  count: number;
  selectedRows: ReceivingAppealListRow[];
  workingStages: ReceivingWorkingStage[];
  disabled?: boolean;
  pending?: boolean;
  blockedMessage?: string | null;
  onCancel: () => void;
  onApply: (draft: ReceivingBulkEditDraft) => void;
};

export function ReceivingBulkEditPanel({
  count,
  selectedRows,
  workingStages,
  disabled = false,
  pending = false,
  blockedMessage,
  onCancel,
  onApply,
}: ReceivingBulkEditPanelProps) {
  const [stageKey, setStageKey] = useState("");
  const [note, setNote] = useState("");
  const [noteAppend, setNoteAppend] = useState(true);
  const [validation, setValidation] = useState<string | null>(null);

  const stageBlocked = useMemo(
    () => selectedRows.some((row) => isReceivingAppealLockedForBulkStage(row)),
    [selectedRows],
  );

  const stageOptions = workingStages.filter(
    (s) => !isReceivingFinancialStageKey(s.id) && s.id !== RECEIVING_SYSTEM_STAGE.REFUSED,
  );

  return (
    <aside
      className={`panel stack ca-bulk-edit ${styles.receivingShell}`}
      data-testid="ca-receiving-bulk-edit"
      data-bulk-stage-blocked={stageBlocked ? "1" : "0"}
    >
      <h3>Групповое изменение · {count}</h3>
      {blockedMessage ? (
        <p className="field-error" role="status">
          {blockedMessage}
        </p>
      ) : null}
      {stageBlocked ? (
        <p className="small muted">
          Снимите из выборки закрытые обращения (оплата/отгрузка/отказ), чтобы менять этап.
        </p>
      ) : null}
      <label className="field">
        Этап работ
        <select
          name="bulk-stage"
          value={stageKey}
          disabled={disabled || pending || stageBlocked}
          onChange={(e) => setStageKey(e.target.value)}
        >
          <option value="">Не менять</option>
          {stageOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <small className="input-hint">
          {stageBlocked
            ? "Этап заблокирован для части выборки."
            : "Только рабочие этапы — без оплаты и отгрузки."}
        </small>
      </label>
      <label className="field">
        Служебная заметка
        <textarea
          name="bulk-note"
          rows={2}
          maxLength={2000}
          placeholder="Текст для команды"
          value={note}
          disabled={disabled || pending}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <label className="field ca-check-line">
        <input
          type="checkbox"
          name="bulk-note-append"
          checked={noteAppend}
          disabled={disabled || pending}
          onChange={(e) => setNoteAppend(e.target.checked)}
        />
        Добавить к существующей заметке
      </label>
      {validation ? (
        <p className="field-error" role="alert">
          {validation}
        </p>
      ) : null}
      <div className="ca-form-actions">
        <button type="button" className="btn ghost" disabled={pending} onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn primary"
          data-ca-action="bulk:edit-apply"
          disabled={disabled || pending}
          onClick={() => {
            setValidation(null);
            const trimmedNote = note.trim();
            if (!stageKey && !trimmedNote) {
              setValidation("Укажите этап или заметку.");
              return;
            }
            onApply({
              stageKey: stageKey || undefined,
              privateNotes: trimmedNote || undefined,
              noteAppend,
            });
          }}
        >
          {pending ? "Применение…" : "Применить"}
        </button>
      </div>
    </aside>
  );
}
