"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "../observer/observer.module.css";
import type { ReceivingBulkContractState } from "./ReceivingBulkActions";
import type { ReceivingBulkEditDraft, ReceivingWorkingStageOption } from "./receiving-bulk-handoff";

type Props = {
  count: number;
  stageOptions: ReceivingWorkingStageOption[];
  /** Prototype `bulkStageEditBlocked` — paid/shipped/return/refused in selection. */
  stageBlocked: boolean;
  contractState?: ReceivingBulkContractState;
  saveError?: string | null;
  onCancel: () => void;
  onApply: (draft: ReceivingBulkEditDraft) => void;
};

export function ReceivingBulkEditPanel({
  count,
  stageOptions,
  stageBlocked,
  contractState = "blocked",
  saveError,
  onCancel,
  onApply,
}: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [stageId, setStageId] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [appendNote, setAppendNote] = useState(true);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("select,textarea")?.focus({ preventScroll: true });
  }, [count]);

  const applyDisabled = contractState === "blocked" || contractState === "pending";

  const draft = (): ReceivingBulkEditDraft => ({
    stageId: stageBlocked ? "" : stageId,
    serviceNote: serviceNote.trim(),
    appendNote,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractState !== "ready") return;
    onApply(draft());
  };

  return (
    <form
      ref={formRef}
      className={styles.editPanel}
      data-ca-bulk-edit
      data-bulk-stage-blocked={stageBlocked ? "1" : "0"}
      data-contract-state={contractState}
      onSubmit={submit}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>Групповое изменение · {count}</h3>
      {stageBlocked ? (
        <p className={styles.persistenceNotice} role="status">
          В выборке есть оплаченные, отгруженные, с возвратом или закрытые обращения — рабочий этап
          для всей группы изменить нельзя. Можно добавить служебную заметку.
        </p>
      ) : (
        <p className={styles.mutedSmall}>Нельзя массово ставить «Оплачено», «Отгружено» или «Возврат».</p>
      )}
      <label className={styles.field}>
        Этап работ
        <select
          name="bulk-stage"
          value={stageId}
          disabled={stageBlocked || applyDisabled}
          onChange={(e) => setStageId(e.target.value)}
        >
          <option value="">Не менять</option>
          {stageOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.mutedSmall}>
          {stageBlocked
            ? "Снимите из выборки закрытые обращения, чтобы менять этап."
            : "Только рабочие этапы, без оплаты и отгрузки."}
        </span>
      </label>
      <label className={styles.field}>
        Служебная заметка
        <textarea
          name="bulk-note"
          rows={2}
          maxLength={2000}
          placeholder="Текст для команды"
          value={serviceNote}
          onChange={(e) => setServiceNote(e.target.value)}
        />
      </label>
      <label className={styles.personalCheck}>
        <input
          type="checkbox"
          name="bulk-note-append"
          checked={appendNote}
          onChange={(e) => setAppendNote(e.target.checked)}
        />
        Добавить к существующей заметке
      </label>
      {saveError ? (
        <p className={styles.persistenceNotice} role="alert">
          {saveError}
        </p>
      ) : null}
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-ca-action="bulk:edit-cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="submit"
          className={styles.primaryBtn}
          data-ca-action="bulk:edit-apply"
          disabled={applyDisabled}
          aria-disabled={applyDisabled}
        >
          {contractState === "pending" ? "Применение…" : contractState === "blocked" ? "Применить (недоступно)" : "Применить"}
        </button>
      </div>
    </form>
  );
}
