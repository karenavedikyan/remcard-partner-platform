"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./OrganizationModerationDetail.module.css";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  requireText?: boolean;
  textLabel?: string;
  textValue: string;
  onTextChange: (v: string) => void;
  textError?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ModerationConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  busy,
  requireText,
  textLabel,
  textValue,
  onTextChange,
  textError,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <p className={styles.metaLine} style={{ whiteSpace: "pre-wrap" }}>
          {description}
        </p>
        {requireText ? (
          <>
            <label htmlFor={`${titleId}-field`}>{textLabel}</label>
            <textarea
              id={`${titleId}-field`}
              className={styles.dialogField}
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              disabled={busy}
            />
            {textError ? (
              <p className={styles.statusError} role="alert">
                {textError}
              </p>
            ) : null}
          </>
        ) : null}
        <div className={styles.dialogActions}>
          <Button ref={cancelRef} type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="button"
            variant={danger ? "primary" : "primary"}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
