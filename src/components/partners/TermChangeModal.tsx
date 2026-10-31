"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  getFocusableElements,
  handleDialogTabKey,
  lockBodyScroll,
  unlockBodyScroll,
} from "@/lib/dialog-focus";
import styles from "./TermChangeModal.module.css";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Panel mutation in flight — Escape / backdrop / close must not dismiss. */
  busy?: boolean;
  /**
   * When an overlying confirm owns focus (dirty discard),
   * suspend Escape + focus trap so only the top workflow is active.
   */
  suspendFocusTrap?: boolean;
  children: ReactNode;
};

/**
 * Centered C1 term-change shell (frozen R1 cooperation modal geometry).
 * Presentation / focus routing only — mutations stay in TermChangePanel.
 */
export function TermChangeModal({
  open,
  title,
  onClose,
  busy = false,
  suspendFocusTrap = false,
  children,
}: Props) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();

    if (suspendFocusTrap) {
      return () => {
        unlockBodyScroll();
      };
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        onCloseRef.current();
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
      focusable[0]?.focus({ preventScroll: true });
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("focusin", onFocusIn, true);
      unlockBodyScroll();
    };
  }, [open, suspendFocusTrap, busy]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      data-testid="partner-term-change-modal-backdrop"
      data-busy={busy ? "true" : "false"}
      onClick={() => {
        if (busy || suspendFocusTrap) return;
        onCloseRef.current();
      }}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="partner-term-change-modal"
        data-busy={busy ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          tabIndex={0}
          aria-hidden="true"
          className={styles.focusSentinel}
          data-testid="partner-term-change-focus-start"
          onFocus={() => {
            const focusable = sheetRef.current
              ? getFocusableElements(sheetRef.current)
              : [];
            focusable[focusable.length - 1]?.focus({ preventScroll: true });
          }}
        />
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть"
            data-testid="term-change-close"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              onCloseRef.current();
            }}
          >
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        <span
          tabIndex={0}
          aria-hidden="true"
          className={styles.focusSentinel}
          data-testid="partner-term-change-focus-end"
          onFocus={() => {
            const focusable = sheetRef.current
              ? getFocusableElements(sheetRef.current)
              : [];
            focusable[0]?.focus({ preventScroll: true });
          }}
        />
      </div>
    </div>
  );
}
