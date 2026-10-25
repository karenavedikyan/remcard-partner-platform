"use client";

import { useEffect, useState } from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { Button } from "@/components/ui/Button";
import { specialistClientFormCopy } from "@/lib/agent-r03/specialistClientFormCopy";
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
  /** When true, optional contacts block stays open (edit flow). */
  editing?: boolean;
  onClose: () => void;
  onSubmit: (values: AgentClientFormValues) => Promise<void>;
};

export function AgentClientFormDialog({
  accessMode = "agent",
  open,
  title,
  initial,
  submitLabel,
  editing = false,
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

  const optionalContactsBlock =
    accessMode === "specialist" ? (
      <details
        className={`${styles.certificateTerms} ${styles.specialistOptionalContacts}`}
        open={editing}
      >
        <summary>Контакты и заметка · необязательно</summary>
        <div className={styles.termsBody}>
          <label className={styles.field}>
            Город
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} />
          </label>
          <label className={styles.field}>
            Телефон
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={40} />
          </label>
          <label className={styles.field}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" maxLength={120} />
          </label>
          <label className={styles.field}>
            Заметка
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
          </label>
        </div>
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
        <label className={styles.field}>
          Заметка
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
      </>
    );

  const specialistForm = accessMode === "specialist" || accessMode === "business";
  const specialistCopy = specialistForm ? specialistClientFormCopy(editing) : null;
  const dialogTitle = specialistCopy?.title ?? title;
  const dialogSubmitLabel = specialistCopy?.submitLabel ?? submitLabel;
  const nameFieldLabel = specialistCopy?.nameLabel ?? "Имя";

  return (
    <div className={styles.dialogBackdrop} role="presentation" onClick={onClose}>
      <form
        className={
          specialistForm
            ? `${styles.r03Root} ${styles.dialogPanel} ${styles.specialistClientFormPanel}`
            : styles.dialogPanel
        }
        role="dialog"
        aria-labelledby="client-form-title"
        data-testid="agent-client-form-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        {specialistForm ? (
          <div className={styles.dialogTitleRow}>
            <h2 id="client-form-title">{dialogTitle}</h2>
            <button
              type="button"
              className={styles.dialogCloseBtn}
              aria-label="Закрыть"
              onClick={onClose}
              disabled={saving}
            >
              ×
            </button>
          </div>
        ) : (
          <h2 id="client-form-title">{dialogTitle}</h2>
        )}
        <label className={styles.field}>
          {nameFieldLabel}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            {...(accessMode === "specialist"
              ? { maxLength: 100, placeholder: "Как обращаться к клиенту" }
              : {})}
          />
        </label>
        {accessMode === "specialist" || accessMode === "business" ? (
          <label className={styles.field}>
            {accessMode === "business" ? "Потребность · необязательно" : "Задача · необязательно"}
            <input
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              maxLength={160}
              placeholder="Например, ремонт квартиры"
            />
          </label>
        ) : null}
        {optionalContactsBlock}
        {error ? (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        ) : null}
        <div className={specialistForm ? styles.specialistDialogActions : styles.dialogActions}>
          {!specialistForm ? (
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
          ) : null}
          <Button type="submit" disabled={saving} className={specialistForm ? styles.specialistFormPrimary : undefined}>
            {saving ? "Сохранение…" : dialogSubmitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
