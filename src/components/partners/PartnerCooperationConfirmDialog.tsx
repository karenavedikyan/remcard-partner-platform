"use client";

import { useEffect, useId, useRef } from "react";
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
  testId?: string;
  onConfirm: () => void;
  onDismiss: () => void;
};

/**
 * In-page confirm for C1 pause/resume and dirty term-draft discard.
 * Escape always activates the safe action (Keep / Cancel), never silent discard.
 */
export function PartnerCooperationConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  dismissLabel,
  safeAction,
  busy,
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
    // Reveal question + safe control in viewport, then focus without relying on scroll-on-focus alone
    const scrollNearest = (el: HTMLElement | null) => {
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    scrollNearest(sheetRef.current);
    scrollNearest(safeRef.current);
    safeRef.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (busy) return;
      if (safeAction === "confirm") onConfirmRef.current();
      else onDismissRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, safeAction, busy]);

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