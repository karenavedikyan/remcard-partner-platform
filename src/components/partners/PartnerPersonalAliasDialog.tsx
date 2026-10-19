"use client";

import { useEffect, useId, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./PartnerPersonalAliasDialog.module.css";

type Props = {
  open: boolean;
  partnershipId: string | null;
  initialAlias: string;
  onClose: () => void;
  onSaved: () => void;
};

export function PartnerPersonalAliasDialog({
  open,
  partnershipId,
  initialAlias,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [value, setValue] = useState(initialAlias);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(initialAlias);
    setError("");
  }, [open, initialAlias, partnershipId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !partnershipId) return null;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const trimmed = value.trim();
      await patchPartnershipListPreference(partnershipId!, {
        personalAlias: trimmed.length ? trimmed : null,
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить название");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="partner-personal-alias-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>Название для себя</h2>
        <p className={styles.hint}>
          Меняется только название в вашем списке. Официальное название партнёра и условия сотрудничества не
          изменяются.
        </p>
        <TextField
          label="Название для себя"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
          disabled={busy}
          autoFocus
          hint="Оставьте пустым, чтобы снова показывать официальное название"
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
