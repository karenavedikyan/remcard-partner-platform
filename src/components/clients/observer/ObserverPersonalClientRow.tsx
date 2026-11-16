"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPersonalMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { stageBadgeClassName } from "@/components/clients/receiving/receiving-display";

type Props = {
  appeal: ObserverReferredAppeal;
  meta?: ObserverPersonalMeta;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  grouped?: boolean;
  /** Receiving partner name shown in the flat list (the grouped layout already sits under the partner). */
  partnerName?: string;
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
  partnerName,
  showEdit = true,
  onEdit,
  onOpen,
}: Props) {
  const name = displayClientName(appeal, meta?.alias);
  const status = observerAppealStatusLabel(appeal);
  const date = formatObserverDateTime(appeal.updatedAt);
  const interest = appeal.interest?.trim() || "Интерес не указан";

  return (
    <div
      className={`ca-personal-row${grouped ? " ca-observer-card-client" : ""}`}
      data-personal-row={appeal.id}
      data-selected={selected ? "true" : "false"}
      data-testid="ca-observer-client-row"
    >
      <label className="ca-personal-check">
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
        className="ca-personal-open"
        data-ca-action={`observer:client:${appeal.id}`}
        onClick={() => onOpen?.()}
      >
        <strong>{name}</strong>
        {meta?.alias && meta.alias !== appeal.clientName ? (
          <span className="small muted">У партнёра: {appeal.clientName}</span>
        ) : null}
        <span className="small muted">
          {grouped || !partnerName ? "" : `${partnerName} · `}
          {interest}
        </span>
        {meta?.tag ? (
          <span className="ca-personal-tag">{grouped ? `Моя метка: ${meta.tag}` : meta.tag}</span>
        ) : null}
        {meta?.note ? (
          <span className="small ca-personal-note">{grouped ? `Моя заметка: ${meta.note}` : meta.note}</span>
        ) : null}
      </button>
      <div className="ca-personal-status">
        {grouped ? <span className="ca-observer-cell-label">Статус у партнёра</span> : null}
        <span className={stageBadgeClassName(String(appeal.stageId), status)}>{status}</span>
        {grouped ? null : (
          <time className="small muted" dateTime={appeal.updatedAt}>
            {date}
          </time>
        )}
      </div>
      {grouped ? (
        <div className="ca-observer-client-updated">
          <span className="ca-observer-cell-label">Обновлено</span>
          <time dateTime={appeal.updatedAt}>{date}</time>
        </div>
      ) : null}
      {showEdit && onEdit ? (
        <button
          type="button"
          className="btn ghost small-btn"
          data-observer-action={`edit:${appeal.id}`}
          aria-label={`Изменить личную запись: ${name}`}
          onClick={onEdit}
        >
          {grouped ? "Изменить для себя" : "Изменить"}
        </button>
      ) : null}
    </div>
  );
}
