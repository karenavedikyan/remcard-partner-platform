"use client";

import { useEffect, useRef } from "react";
import { CatalogPublicationPreview } from "@/components/profile/CatalogPublicationPreview";
import { Button } from "@/components/ui/Button";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import styles from "./OrganizationModerationDetail.module.css";

type Props = {
  open: boolean;
  mode: "list" | "full";
  onClose: () => void;
  profile: ProProfileResponse;
  draft: ProfileDraft;
  partnerType: string;
};

export function ModerationPreviewModal({ open, mode, onClose, profile, draft, partnerType }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const variant = partnerType === "MASTER" ? "specialist" : "business";

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.previewDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderation-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="moderation-preview-title" className={styles.dialogTitle}>
          {mode === "list" ? "Карточка в списке" : "Полная карточка"} · предпросмотр заявки
        </h2>
        <p className={styles.metaLine}>
          Показаны данные отправленной на проверку версии. Публикация не выполняется.
        </p>
        <div className={mode === "list" ? styles.previewList : styles.previewFull}>
          <CatalogPublicationPreview variant={variant} profile={profile} draft={draft} />
        </div>
        <div className={styles.dialogActions}>
          <Button ref={closeRef} type="button" variant="primary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
