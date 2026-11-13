"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./observer.module.css";

export type PersonalEditDraft = {
  alias: string;
  tag: string;
  note: string;
};

export type ObserverPersonalPersistenceStatus = "blocked" | "ready" | "pending" | "error";

type Props = {
  /** Same ids as P3 selection; changes reinitialize draft from `initial`. */
  editTargetKey: string;
  mode: "single" | "bulk";
  count: number;
  initial?: PersonalEditDraft;
  /** Bump on cancel/reopen only — not on error rerenders. */
  draftSeed?: number | string;
  persistenceStatus?: ObserverPersonalPersistenceStatus;
  saveError?: string | null;
  onCancel: () => void;
  /** Legacy blocked path: parent shows global notice without mutating. */
  onAttemptSave?: () => void;
  /** Called when persistenceStatus is ready or error (retry). Never when pending/blocked. */
  onSave?: (draft: PersonalEditDraft) => void;
};

export function ObserverPersonalEditPanel({
  editTargetKey,
  mode,
  count,
  initial,
  draftSeed = 0,
  persistenceStatus = "blocked",
  saveError,
  onCancel,
  onAttemptSave,
  onSave,
}: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const draftBindingRef = useRef<string | null>(null);
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  useEffect(() => {
    const binding = `${editTargetKey}\0${mode}\0${count}\0${draftSeed}`;
    if (draftBindingRef.current === binding) return;
    draftBindingRef.current = binding;
    setAlias(initial?.alias ?? "");
    setTag(initial?.tag ?? "");
    setNote(initial?.note ?? "");
  }, [editTargetKey, mode, count, draftSeed, initial]);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("input,textarea")?.focus({ preventScroll: true });
  }, [mode, count]);

  const draft = (): PersonalEditDraft => ({
    alias: alias.trim(),
    tag: tag.trim(),
    note: note.trim(),
  });

  const saveDisabled = persistenceStatus === "blocked" || persistenceStatus === "pending";

  const saveLabel =
    persistenceStatus === "pending"
      ? "Сохранение…"
      : persistenceStatus === "blocked"
        ? "Сохранить (недоступно)"
        : persistenceStatus === "error"
          ? mode === "single"
            ? "Повторить сохранение"
            : `Повторить для ${count} записей`
          : mode === "single"
            ? "Сохранить для себя"
            : `Применить к ${count} записям`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (persistenceStatus === "pending") return;
    if ((persistenceStatus === "ready" || persistenceStatus === "error") && onSave) {
      onSave(draft());
      return;
    }
    if (persistenceStatus === "blocked" && onAttemptSave) {
      onAttemptSave();
    }
  };

  return (
    <form
      ref={formRef}
      className={styles.editPanel}
      data-observer-personal-edit
      data-edit-target-key={editTargetKey}
      data-persistence-status={persistenceStatus}
      onSubmit={submit}
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
      {saveError ? (
        <p className={styles.persistenceNotice} role="alert">
          {saveError}
        </p>
      ) : null}
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-observer-action="cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={saveDisabled}
          aria-disabled={saveDisabled}
          title={persistenceStatus === "blocked" ? "BLOCKED_PERSISTENCE" : undefined}
          data-observer-action="save"
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
