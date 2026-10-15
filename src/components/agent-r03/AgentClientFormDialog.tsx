"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

export type AgentClientFormValues = {
  displayName: string;
  phone: string;
  email: string;
  city: string;
  note: string;
};

type Props = {
  open: boolean;
  title: string;
  initial?: Partial<AgentClientFormValues>;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: AgentClientFormValues) => Promise<void>;
};

export function AgentClientFormDialog({
  open,
  title,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDisplayName(initial?.displayName ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setCity(initial?.city ?? "");
    setNote(initial?.note ?? "");
    setError("");
  }, [open, initial?.displayName, initial?.phone, initial?.email, initial?.city, initial?.note]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Укажите имя клиента");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        displayName: displayName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim(),
        note: note.trim(),
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation" onClick={onClose}>
      <form
        className={styles.dialogPanel}
        role="dialog"
        aria-labelledby="client-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h2 id="client-form-title">{title}</h2>
        <label className={styles.field}>
          Имя
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Телефон
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <label className={styles.field}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label className={styles.field}>
          Город
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className={styles.field}>
          Заметка
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
        {error ? (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        ) : null}
        <div className={styles.dialogActions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
