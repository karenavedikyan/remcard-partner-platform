"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { AdminPasswordLoginForm } from "@/components/auth/AdminPasswordLoginForm";
import type { AdminCapabilitiesState } from "@/components/auth/LoginExperience";
import styles from "./auth.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  returnTo?: string | null;
  adminCaps: AdminCapabilitiesState;
};

export function AdminLoginModal({ open, onClose, returnTo, adminCaps }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    restoreFocusRef.current?.focus({ preventScroll: true });
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) {
        dialog.showModal();
      }
      const timer = window.setTimeout(() => {
        if (adminCaps === "enabled") {
          dialog.querySelector<HTMLInputElement>('[data-testid="admin-login-input"]')?.focus({
            preventScroll: true,
          });
        } else {
          dialog.querySelector<HTMLButtonElement>('[data-testid="admin-login-close"]')?.focus({
            preventScroll: true,
          });
        }
      }, 0);
      const getFocusables = () =>
        Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));

      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
          return;
        }
        if (event.key !== "Tab") return;
        const focusables = getFocusables();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      };
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      return () => {
        window.clearTimeout(timer);
        document.body.style.overflow = previousOverflow;
        document.removeEventListener("keydown", onKey);
      };
    }

    if (dialog.open) {
      dialog.close();
    }
    return undefined;
  }, [adminCaps, handleClose, open]);

  if (!open) return null;

  const showForm = adminCaps === "enabled";
  const showPending = adminCaps === "pending";
  const showBlocked = adminCaps === "disabled" || adminCaps === "error";

  return (
    <dialog
      ref={dialogRef}
      className={styles.adminModalDialog}
      aria-labelledby={titleId}
      data-testid="admin-login-modal"
      onClose={() => onClose()}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) handleClose();
      }}
    >
      <div className={styles.adminModalPanelInner}>
        <div className={styles.adminModalHeader}>
          <h2 id={titleId} className={styles.adminModalTitle}>
            Вход администратора
          </h2>
          <button
            type="button"
            className={styles.adminModalClose}
            aria-label="Закрыть"
            data-testid="admin-login-close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        {showPending ? (
          <p className={styles.adminStatus} role="status" data-testid="admin-login-pending">
            Проверяем доступ к входу администратора…
          </p>
        ) : null}
        {showForm ? (
          <AdminPasswordLoginForm returnTo={returnTo} variant="modal" onSuccess={handleClose} />
        ) : null}
        {showBlocked ? (
          <div className={styles.adminBlocked} data-testid="admin-login-unavailable">
            <p role="alert">
              {adminCaps === "error"
                ? "Не удалось проверить доступ к входу администратора. Попробуйте позже."
                : "Вход администратора на этой площадке отключён."}
            </p>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
