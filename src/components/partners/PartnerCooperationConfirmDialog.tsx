"use client";

import { useEffect, useId, useRef } from "react";
import { getFocusableElements, handleDialogTabKey } from "@/lib/dialog-focus";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerCooperationConfirmDialog.module.css";

type Props = {
  open: boolean;
  title: string;
  body: string;
  /** Safe / primary affirmative (Keep, or confirm pause). */
  confirmLabel: string;
  /** Secondary / dismiss (Cancel, or Discard). */
  dismissLabel: string;
  /** Which control is the safe default focus and Escape target. */
  safeAction: "confirm" | "dismiss";
  busy?: boolean;
  /** Visible in-dialog error (e.g. PATCH failure) — not behind an overlay. */
  error?: string;
  testId?: string;
  onConfirm: () => void;
  onDismiss: () => void;
};

/**
 * In-page confirm for C1 pause/resume and dirty term-draft discard.
 * Escape always activates the safe action (Keep / Cancel), never silent discard.
 * Owns the single active focus trap while open (detail must suspend underneath).
 */
export function PartnerCooperationConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  dismissLabel,
  safeAction,
  busy,
  error = "",
  testId = "partner-cooperation-confirm",
  onConfirm,
  onDismiss,
}: Props) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onConfirmRef = useRef(onConfirm);
  const onDismissRef = useRef(onDismiss);
  onConfirmRef.current = onConfirm;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const safeRef = safeAction === "confirm" ? confirmRef : dismissRef;
    const scrollNearest = (el: HTMLElement | null) => {
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    scrollNearest(sheetRef.current);
    scrollNearest(safeRef.current);
    // After an error appears while still open, keep focus on a usable control.
    if (error) {
      (busy ? dismissRef.current : confirmRef.current)?.focus({ preventScroll: true });
    } else {
      safeRef.current?.focus({ preventScroll: true });
    }

    const activateSafe = () => {
      if (busy) return;
      if (safeAction === "confirm") onConfirmRef.current();
      else onDismissRef.current();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        activateSafe();
        return;
      }
      const sheet = sheetRef.current;
      if (sheet) handleDialogTabKey(event, sheet);
    };

    const onFocusIn = (event: FocusEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const target = event.target;
      if (target instanceof Node && sheet.contains(target)) return;
      event.stopPropagation();
      const focusable = getFocusableElements(sheet);
      const preferred =
        error && !busy
          ? confirmRef.current
          : safeAction === "confirm"
            ? confirmRef.current
            : dismissRef.current;
      (preferred ?? focusable[0])?.focus({ preventScroll: true });
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focusin", onFocusIn, true);
    };
  }, [open, safeAction, busy, error]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      data-testid={`${testId}-backdrop`}
      onClick={() => {
        if (busy) return;
        if (safeAction === "confirm") onConfirm();
        else onDismiss();
      }}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p className={styles.body}>{body}</p>
        {error ? (
          <p className={styles.error} role="alert" data-testid={`${testId}-error`}>
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button
            ref={confirmRef}
            type="button"
            variant="primary"
            disabled={busy}
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            ref={dismissRef}
            type="button"
            variant="secondary"
            disabled={busy}
            data-testid={`${testId}-dismiss`}
            onClick={onDismiss}
          >
            {dismissLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
