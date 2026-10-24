"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogPublicationPreview } from "@/components/profile/CatalogPublicationPreview";
import { Button } from "@/components/ui/Button";
import { RemcardApiError } from "@/lib/api-client";
import {
  buildModerationOrgPreviewRevisionQuery,
  fetchModerationOrganizationPublicPreview,
  moderationOrgPreviewRevisionFetchKey,
} from "@/lib/prof-admin-moderation-api";
import { buildModerationOrgCatalogPreviewInput } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";
import { staleRevisionUserMessage } from "@/lib/prof-admin-moderation-org-actions";
import {
  ModerationOrgCatalogFullPreview,
  type ModerationPublicPreviewPayload,
} from "./ModerationOrgCatalogFullPreview";
import { useModerationModalFocusTrap } from "./useModerationModalFocusTrap";
import styles from "./OrganizationModerationDetail.module.css";

type Props = {
  open: boolean;
  mode: "list" | "full";
  onClose: () => void;
  org: ModerationOrgDetail;
};

export function ModerationPreviewModal({ open, mode, onClose, org }: Props) {
  const trapRef = useModerationModalFocusTrap(open);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fullPayload, setFullPayload] = useState<ModerationPublicPreviewPayload | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const loadGenRef = useRef(0);
  const orgRef = useRef(org);
  orgRef.current = org;

  const revisionFetchKey = moderationOrgPreviewRevisionFetchKey(org);

  useEffect(() => {
    if (!open || mode !== "full") return;

    const ac = new AbortController();
    const gen = ++loadGenRef.current;
    const { id: orgId, revisionToken } = orgRef.current;
    const revisionQuery = buildModerationOrgPreviewRevisionQuery(orgRef.current);

    setFullLoading(true);
    setFullError(null);

    void (async () => {
      try {
        const res = await fetchModerationOrganizationPublicPreview(orgId, {
          ...revisionQuery,
          signal: ac.signal,
        });
        if (gen !== loadGenRef.current) return;
        const payload = res as ModerationPublicPreviewPayload;
        if (
          payload.organizationRevisionToken &&
          payload.organizationRevisionToken !== revisionToken
        ) {
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

  const onCancelRef = useRef(onClose);
  onCancelRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const { profile, draft } = buildModerationOrgCatalogPreviewInput(org);
  const variant = org.partnerType === "MASTER" ? "specialist" : "business";

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        ref={trapRef}
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
