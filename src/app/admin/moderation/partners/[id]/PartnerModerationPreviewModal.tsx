"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import styles from "./PartnerModerationDetail.module.css";

type Props = {
  open: boolean;
  mode: "list" | "full";
  onClose: () => void;
  partner: ModerationPartnerDetail;
};

export function PartnerModerationPreviewModal({ open, mode, onClose, partner }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const [fullPayload, setFullPayload] = useState<ModerationPartnerPublicPreviewPayload | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const loadGenRef = useRef(0);
  const partnerRef = useRef(partner);
  partnerRef.current = partner;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const revisionFetchKey = moderationPartnerPreviewRevisionFetchKey(partner);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const restore = restoreFocusRef.current;
    onCloseRef.current();
    queueMicrotask(() => {
      restore?.focus?.();
      closingRef.current = false;
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      closingRef.current = false;
      const active = document.activeElement;
      restoreFocusRef.current = active instanceof HTMLElement ? active : null;
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => closeRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Register only while the dialog node is mounted (open=true). An empty-deps
    // effect runs on the open=false first paint when ref is still null and never
    // rebinds — Escape would close the native dialog without syncing React state.
    const syncClosed = () => {
      requestClose();
    };
    dialog.addEventListener("cancel", syncClosed);
    dialog.addEventListener("close", syncClosed);
    return () => {
      dialog.removeEventListener("cancel", syncClosed);
      dialog.removeEventListener("close", syncClosed);
    };
  }, [open]);

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
    <dialog
      ref={dialogRef}
      className={styles.previewDialog}
      aria-modal="true"
      aria-labelledby={titleId}
      data-partner-moderation-preview="true"
    >
      <div className={styles.previewHead}>
        <h2 id={titleId}>
          {mode === "list" ? "Карточка в списке каталога" : "Полная карточка партнёра"}
        </h2>
        <button
          ref={closeRef}
          type="button"
          className={styles.previewClose}
          aria-label="Закрыть окно"
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.previewBody}>
        <p className={styles.metaLine}>
          {mode === "list"
            ? "Компактный вид результата поиска (отправленная заявка)."
            : "Структура публичной карточки /partner по серверным данным отправленной заявки."}
        </p>

        {mode === "list" ? (
          <div className={styles.previewList}>
            <CatalogPublicationPreview variant={variant} profile={profile} draft={draft} />
          </div>
        ) : fullLoading ? (
          <p role="status">Загрузка предпросмотра…</p>
        ) : fullError ? (
          <p role="alert" className={styles.statusError}>
            {fullError}
          </p>
        ) : fullPayload ? (
          <ModerationPartnerCatalogFullPreview data={fullPayload} />
        ) : null}
      </div>
      <div className={styles.previewFooter}>
        <Button type="button" variant="primary" onClick={requestClose}>
          Закрыть
        </Button>
      </div>
    </dialog>
  );
}
