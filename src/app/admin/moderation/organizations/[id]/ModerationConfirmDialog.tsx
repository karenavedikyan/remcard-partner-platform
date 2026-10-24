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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const didFocusOnOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      didFocusOnOpen.current = false;
      return;
    }
    if (didFocusOnOpen.current) return;
    didFocusOnOpen.current = true;
    if (requireText) {
      textRef.current?.focus();
    } else {
      cancelRef.current?.focus();
    }
  }, [open, requireText]);

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  if (!open) return null;

  const handleOverlay = () => {
    if (!busy) onCancel();
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={handleOverlay}>
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
              ref={textRef}
              id={`${titleId}-field`}
              className={styles.dialogField}
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              disabled={busy}
              aria-invalid={textError ? true : undefined}
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
          <Button type="button" variant="primary" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
