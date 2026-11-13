"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPersonalMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import styles from "./observer.module.css";

type Props = {
  appeal: ObserverReferredAppeal;
  meta?: ObserverPersonalMeta;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  grouped?: boolean;
  showEdit?: boolean;
  onEdit?: () => void;
  onOpen?: () => void;
};

export function ObserverPersonalClientRow({
  appeal,
  meta,
  selected,
  onSelect,
  grouped = false,
  showEdit = true,
  onEdit,
  onOpen,
}: Props) {
  const name = displayClientName(appeal, meta?.alias);
  const status = observerAppealStatusLabel(appeal);
  const date = formatObserverDateTime(appeal.updatedAt);

  return (
    <div
      className={`${styles.personalRow}${grouped ? ` ${styles.personalRowGrouped}` : ""}`}
      data-personal-row={appeal.id}
      data-selected={selected ? "true" : "false"}
      data-testid="ca-observer-client-row"
    >
      <label className={styles.personalCheck}>
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Выбрать: ${name}`}
          data-observer-id={appeal.id}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </label>
      <button
        type="button"
        className={styles.personalOpen}
        data-ca-action={`observer:client:${appeal.id}`}
        onClick={() => onOpen?.()}
      >
        <strong>{name}</strong>
        {meta?.alias && meta.alias !== appeal.clientName ? (
          <span className={styles.mutedSmall}>У партнёра: {appeal.clientName}</span>
        ) : null}
        <span className={styles.mutedSmall}>
          {appeal.interest || appeal.certificateId || "Интерес не указан"}
        </span>
        {meta?.tag ? (
          <span className={styles.personalTag}>
            {grouped ? `Моя метка: ${meta.tag}` : meta.tag}
          </span>
        ) : null}
        {meta?.note ? (
          <span className={styles.personalNote}>
            {grouped ? `Моя заметка: ${meta.note}` : meta.note}
          </span>
        ) : null}
      </button>
      <div className={styles.personalStatus}>
        {grouped ? <span className={styles.cellLabel}>Статус у партнёра</span> : null}
        <span className={styles.statusPill}>{status}</span>
      </div>
      {grouped ? (
        <div className={styles.clientUpdated}>
          <span className={styles.cellLabel}>Обновлено</span>
          <time dateTime={appeal.updatedAt}>{date}</time>
        </div>
      ) : (
        <time className={styles.mutedSmall} dateTime={appeal.updatedAt}>
          {date}
        </time>
      )}
      {showEdit && onEdit ? (
        <button
          type="button"
          className={styles.ghostBtn}
          data-observer-action={`edit:${appeal.id}`}
          onClick={onEdit}
        >
          {grouped ? "Изменить для себя" : "Изменить"}
        </button>
      ) : null}
    </div>
  );
}
