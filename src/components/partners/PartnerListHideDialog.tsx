"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerPersonalAliasDialog.module.css";

type Props = {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PartnerListHideDialog({ open, busy, onConfirm, onClose }: Props) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="partner-list-hide-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>Убрать из списка?</h2>
        <p>
          Партнёр исчезнет только из вашего списка. Партнёрство и согласованные условия сохранятся — вы
          сможете вернуть запись из режима «Скрытые».
        </p>
        <div className={styles.actions}>
          <Button ref={confirmRef} variant="primary" disabled={busy} onClick={onConfirm}>
            Убрать из моего списка
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
