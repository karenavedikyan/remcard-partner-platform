"use client";

import { useEffect, useId, useRef } from "react";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      if (adminCaps === "enabled") {
        document.querySelector<HTMLInputElement>('[data-testid="admin-login-input"]')?.focus({
          preventScroll: true,
        });
      } else {
        closeRef.current?.focus({ preventScroll: true });
      }
    }, 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [adminCaps, onClose, open]);

  if (!open) return null;

  const showForm = adminCaps === "enabled";
  const showPending = adminCaps === "pending";
  const showBlocked = adminCaps === "disabled" || adminCaps === "error";

  return (
    <div
      className={styles.adminModalBackdrop}
      role="presentation"
      data-testid="admin-login-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.adminModalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.adminModalHeader}>
          <h2 id={titleId} className={styles.adminModalTitle}>
            Вход администратора
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.adminModalClose}
            aria-label="Закрыть"
            data-testid="admin-login-close"
            onClick={onClose}
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
          <AdminPasswordLoginForm returnTo={returnTo} variant="modal" onSuccess={onClose} />
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
    </div>
  );
}
