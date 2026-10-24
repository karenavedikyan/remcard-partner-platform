"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogPublicationPreview } from "@/components/profile/CatalogPublicationPreview";
import { Button } from "@/components/ui/Button";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchModerationPartnerPublicPreview,
  moderationPartnerPreviewRevisionFetchKey,
} from "@/lib/prof-admin-moderation-api";
import {
  buildModerationPartnerCatalogPreviewInput,
  type ModerationPartnerDetail,
} from "@/lib/prof-admin-moderation-partner-display";
import { staleRevisionUserMessage } from "@/lib/prof-admin-moderation-partner-actions";
import {
  ModerationPartnerCatalogFullPreview,
  type ModerationPartnerPublicPreviewPayload,
} from "./ModerationPartnerCatalogFullPreview";
import { useModerationModalFocusTrap } from "../../organizations/[id]/useModerationModalFocusTrap";
import styles from "../../organizations/[id]/OrganizationModerationDetail.module.css";

type Props = {
  open: boolean;
  mode: "list" | "full";
  onClose: () => void;
  partner: ModerationPartnerDetail;
};

export function PartnerModerationPreviewModal({ open, mode, onClose, partner }: Props) {
  const trapRef = useModerationModalFocusTrap(open);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fullPayload, setFullPayload] = useState<ModerationPartnerPublicPreviewPayload | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const loadGenRef = useRef(0);
  const partnerRef = useRef(partner);
  partnerRef.current = partner;

  const revisionFetchKey = moderationPartnerPreviewRevisionFetchKey(partner);

  useEffect(() => {
    if (!open || mode !== "full") return;

    const ac = new AbortController();
    const gen = ++loadGenRef.current;
    const { id, revisionToken } = partnerRef.current;

    setFullLoading(true);
    setFullError(null);

    void (async () => {
      try {
        const res = await fetchModerationPartnerPublicPreview(id, {
          partnerRevision: revisionToken,
          signal: ac.signal,
        });
        if (gen !== loadGenRef.current) return;
        const payload = res as ModerationPartnerPublicPreviewPayload;
        if (payload.partnerRevisionToken && payload.partnerRevisionToken !== revisionToken) {
          setFullPayload(null);
          setFullError(staleRevisionUserMessage());
          return;
        }
        setFullPayload(payload);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (gen !== loadGenRef.current) return;
        setFullPayload(null);
        if (e instanceof RemcardApiError && e.status === 409) {
          setFullError(staleRevisionUserMessage());
        } else {
          setFullError(e instanceof RemcardApiError ? e.message : "Не удалось загрузить предпросмотр");
        }
      } finally {
        if (gen === loadGenRef.current) setFullLoading(false);
      }
    })();

    return () => {
      ac.abort();
      loadGenRef.current += 1;
    };
  }, [open, mode, revisionFetchKey]);

  useEffect(() => {
    if (!open) {
      setFullPayload(null);
      setFullError(null);
      setFullLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const { profile, draft } = buildModerationPartnerCatalogPreviewInput(partner);
  const variant = partner.partnerType === "MASTER" ? "specialist" : "default";

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        ref={trapRef}
        className={styles.previewDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="partner-preview-title" className={styles.dialogTitle}>
          {mode === "list" ? "Карточка в списке каталога" : "Полная карточка партнёра"}
        </h2>
        <p className={styles.metaLine}>
          {mode === "list"
            ? "Компактный вид результата поиска (отправленная заявка)."
            : "Структура публичной карточки /partner (отправленная заявка)."}
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
          <ModerationPartnerCatalogFullPreview data={fullPayload} />
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
