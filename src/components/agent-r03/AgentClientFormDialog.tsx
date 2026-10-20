"use client";

import { useEffect, useState } from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

export type AgentClientFormValues = {
  displayName: string;
  phone: string;
  email: string;
  city: string;
  need: string;
  note: string;
};

type Props = {
  accessMode?: OwnerClientsAccessMode;
  open: boolean;
  title: string;
  initial?: Partial<AgentClientFormValues>;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: AgentClientFormValues) => Promise<void>;
};

export function AgentClientFormDialog({
  accessMode = "agent",
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
  const [need, setNeed] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDisplayName(initial?.displayName ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setCity(initial?.city ?? "");
    setNeed(initial?.need ?? "");
    setNote(initial?.note ?? "");
    setError("");
  }, [
    open,
    initial?.displayName,
    initial?.phone,
    initial?.email,
    initial?.city,
    initial?.need,
    initial?.note,
  ]);

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
        need: need.trim(),
        note: note.trim(),
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const contactFields =
    accessMode === "specialist" ? (
      <details className={styles.certificateTerms} open={Boolean(phone || email || city)}>
        <summary>Контакты (необязательно)</summary>
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
      </details>
    ) : (
      <>
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
      </>
    );

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
        {accessMode === "specialist" ? (
          <label className={styles.field}>
            Задача
            <input value={need} onChange={(e) => setNeed(e.target.value)} maxLength={160} />
          </label>
        ) : null}
        {contactFields}
        <label className={styles.field}>
          {accessMode === "specialist" ? "Заметка" : "Заметка"}
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
