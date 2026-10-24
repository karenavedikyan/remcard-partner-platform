"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogPublicationPreview } from "@/components/profile/CatalogPublicationPreview";
import { Button } from "@/components/ui/Button";
import { RemcardApiError } from "@/lib/api-client";
import { fetchModerationOrganizationPublicPreview } from "@/lib/prof-admin-moderation-api";
import { buildModerationOrgCatalogPreviewInput } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";
import {
  ModerationOrgCatalogFullPreview,
  type ModerationPublicPreviewPayload,
} from "./ModerationOrgCatalogFullPreview";
import styles from "./OrganizationModerationDetail.module.css";

type Props = {
  open: boolean;
  mode: "list" | "full";
  onClose: () => void;
  org: ModerationOrgDetail;
};

export function ModerationPreviewModal({ open, mode, onClose, org }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fullPayload, setFullPayload] = useState<ModerationPublicPreviewPayload | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);
  const [fullLoading, setFullLoading] = useState(false);

  const loadFull = useCallback(async () => {
    setFullLoading(true);
    setFullError(null);
    try {
      const res = await fetchModerationOrganizationPublicPreview(org.id);
      setFullPayload(res as ModerationPublicPreviewPayload);
    } catch (e) {
      setFullPayload(null);
      setFullError(e instanceof RemcardApiError ? e.message : "Не удалось загрузить предпросмотр");
    }
    setFullLoading(false);
  }, [org.id]);

  useEffect(() => {
    if (!open || mode !== "full") return;
    void loadFull();
  }, [open, mode, loadFull]);

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

  const { profile, draft } = buildModerationOrgCatalogPreviewInput(org);
  const variant = org.partnerType === "MASTER" ? "specialist" : "business";

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
          {mode === "list" ? "Карточка в списке каталога" : "Полная карточка организации"}
        </h2>
        <p className={styles.metaLine}>
          {mode === "list"
            ? "Компактный вид результата поиска (отправленная заявка)."
            : "Структура публичной страницы /catalog/org (отправленная заявка, без интерактивных действий связи)."}
        </p>

        {mode === "list" ? (
          <div className={styles.previewList}>
            <CatalogPublicationPreview variant={variant} profile={profile} draft={draft} />
          </div>
        ) : fullLoading ? (
          <p>Загрузка предпросмотра…</p>
        ) : fullError ? (
          <p role="alert" className={styles.statusError}>
            {fullError}
          </p>
        ) : fullPayload ? (
          <div className={styles.previewFull}>
            <ModerationOrgCatalogFullPreview data={fullPayload} />
          </div>
        ) : null}

        <div className={styles.dialogActions}>
          <Button ref={closeRef} type="button" variant="primary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
