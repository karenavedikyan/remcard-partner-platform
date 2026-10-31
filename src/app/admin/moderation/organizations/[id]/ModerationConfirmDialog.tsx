"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useModerationModalFocusTrap } from "./useModerationModalFocusTrap";
import legacyStyles from "./OrganizationModerationDetail.module.css";
import r1Styles from "./ModerationConfirmDialog.r1.module.css";

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
  /** Visual chrome only. Default keeps legacy shared CSS for non-moderation consumers/tests. */
  presentationVariant?: "legacy" | "r1";
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
  presentationVariant = "legacy",
}: Props) {
  const titleId = useId();
  const trapRef = useModerationModalFocusTrap(open);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const didFocusOnOpen = useRef(false);
  const isR1 = presentationVariant === "r1";
  const styles = isR1 ? r1Styles : legacyStyles;

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

  const handleCancel = () => {
    if (!busy) onCancel();
  };

  if (isR1) {
    return (
      <div
        className={styles.overlay}
        role="presentation"
        data-moderation-confirm-variant="r1"
        onClick={handleOverlay}
      >
        <div
          ref={trapRef}
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-moderation-confirm="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.dialogHead}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.dialogClose}
              aria-label="Закрыть окно"
              disabled={Boolean(busy)}
              onClick={handleCancel}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className={styles.dialogBody}>
            <p className={styles.metaLine}>{description}</p>
            {requireText ? (
              <>
                <label className={styles.fieldLabel} htmlFor={`${titleId}-field`}>
                  {textLabel}
                </label>
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
          </div>
          <div className={styles.dialogFooter}>
            <Button ref={cancelRef} type="button" variant="secondary" disabled={busy} onClick={handleCancel}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              className={danger ? styles.confirmDanger : undefined}
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

  return (
    <div className={styles.overlay} role="presentation" data-moderation-confirm-variant="legacy" onClick={handleOverlay}>
      <div
        ref={trapRef}
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
