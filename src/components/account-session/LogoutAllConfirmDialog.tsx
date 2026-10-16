"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/ui/Button";
import { IconMonitorOff } from "@/components/account-session/AccountSessionIcons";
import styles from "@/components/account-session/account-session.module.css";

type LogoutAllConfirmDialogProps = {
  open: boolean;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LogoutAllConfirmDialog({
  open,
  pending,
  error,
  onCancel,
  onConfirm,
}: LogoutAllConfirmDialogProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLButtonElement>('[data-testid="logout-all-cancel"]')?.focus({
      preventScroll: true,
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.dialogPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="logout-all-confirmation"
      >
        <h2 className={styles.dialogTitle} id={titleId}>
          Выйти на всех устройствах?
        </h2>
        <div className={styles.dialogBody}>
          <p>
            Сеансы на всех устройствах, включая это, будут завершены. Чтобы продолжить работу,
            потребуется войти снова.
          </p>
          <p className={styles.dialogMuted}>
            Данные профиля, сертификаты, заказы и история останутся в аккаунте.
          </p>
          {error ? (
            <p className={styles.dialogMuted} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className={styles.dialogActions}>
          <Button
            type="button"
            variant="secondary"
            className={styles.profileBtn}
            data-testid="logout-all-cancel"
            disabled={pending}
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className={styles.profileBtn}
            data-testid="logout-all-confirm"
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            <IconMonitorOff width={18} height={18} />
            {pending ? "Выход…" : "Выйти на всех устройствах"}
          </Button>
        </div>
      </div>
    </div>
  );
}
