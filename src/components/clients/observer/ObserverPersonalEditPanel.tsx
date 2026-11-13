"use client";

import { useEffect, useId, useState } from "react";
import styles from "./observer.module.css";

export type PersonalEditDraft = {
  alias: string;
  tag: string;
  note: string;
};

export type ObserverPersonalPersistenceStatus = "blocked" | "ready" | "pending" | "error";

type Props = {
  mode: "single" | "bulk";
  count: number;
  initial?: PersonalEditDraft;
  /** Stable per open-panel session — avoids wiping user input on parent pending rerenders. */
  editSessionKey: string;
  persistenceStatus: ObserverPersonalPersistenceStatus;
  persistenceError?: string | null;
  onCancel: () => void;
  onSave: (draft: PersonalEditDraft) => void;
};

export function ObserverPersonalEditPanel({
  mode,
  count,
  initial,
  editSessionKey,
  persistenceStatus,
  persistenceError,
  onCancel,
  onSave,
}: Props) {
  const titleId = useId();
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  useEffect(() => {
    setAlias(initial?.alias ?? "");
    setTag(initial?.tag ?? "");
    setNote(initial?.note ?? "");
  }, [editSessionKey]);

  const saveAllowed = persistenceStatus === "ready" || persistenceStatus === "error";

  return (
    <form
      className={styles.editPanel}
      data-observer-personal-edit
      data-testid="ca-observer-personal-edit"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ alias, tag, note });
      }}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>
        {mode === "single" ? "Личная запись о клиенте" : `Метка для ${count} записей`}
      </h3>
      <p className={styles.mutedSmall}>
        {mode === "single"
          ? "Исходное имя, контакты и статус у партнёра не меняются."
          : "Метка заменится у выбранных записей. Имена и заметки останутся прежними."}
      </p>
      {mode === "single" ? (
        <label className={styles.field}>
          Имя для себя
          <input
            name="alias"
            maxLength={100}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
      ) : null}
      <label className={styles.field}>
        {mode === "single" ? "Метка" : "Общая метка"}
        <input
          name="tag"
          maxLength={40}
          value={tag}
          placeholder="Например: связаться в пятницу"
          onChange={(e) => setTag(e.target.value)}
        />
      </label>
      {mode === "single" ? (
        <label className={styles.field}>
          Личная заметка
          <textarea name="note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      ) : (
        <p className={styles.mutedSmall}>Пустое поле удалит метку у выбранных записей.</p>
      )}
      {persistenceError ? (
        <p className={styles.persistenceNotice} role="alert">
          {persistenceError}
        </p>
      ) : null}
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-observer-action="cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={!saveAllowed}
          aria-disabled={!saveAllowed}
          title={persistenceStatus === "blocked" ? "BLOCKED_PERSISTENCE" : undefined}
          data-observer-action="save"
          data-persistence-status={persistenceStatus}
        >
          {persistenceStatus === "blocked"
            ? "Сохранить (недоступно)"
            : persistenceStatus === "pending"
              ? "Сохранение…"
              : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
