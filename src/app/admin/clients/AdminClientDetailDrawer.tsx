"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from "react";
import {
  clientAvatarUrl,
  clientInitials,
  formatClientRegisteredAt,
  type AdminClient,
} from "@/lib/prof-admin-clients-api";
import styles from "./AdminClients.r1.module.css";

function getFocusable(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

function displayName(client: AdminClient): string {
  const name = client.displayName?.trim();
  return name ? name : "—";
}

function displayCity(client: AdminClient): string {
  const city = client.city?.trim();
  return city ? city : "—";
}

function DetailAvatar({ client }: { client: AdminClient }) {
  const src = clientAvatarUrl(client);
  if (src) {
    return (
      <span className={styles.detailAvatar} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
      </span>
    );
  }
  return (
    <span className={styles.detailAvatar} aria-hidden="true">
      {clientInitials(client.displayName)}
    </span>
  );
}

export type AdminClientDetailDrawerProps = {
  client: AdminClient | null;
  onClose: () => void;
  /** Element that opened the drawer — focus returns here on close. */
  returnFocusRef: RefObject<HTMLElement | null>;
};

/**
 * Frozen R1 «Карточка клиента» drawer — readonly, DTO fields only.
 * Missing frozen fields (source / deal stage / consent visits) stay explicit GAP.
 */
export function AdminClientDetailDrawer({
  client,
  onClose,
  returnFocusRef,
}: AdminClientDetailDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const wasOpenRef = useRef(false);
  const open = Boolean(client);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      wasOpenRef.current = true;
      dialog.showModal();
      // Prefer close control for predictable keyboard path; identity is still readable.
      closeBtnRef.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenRef.current) return;
    wasOpenRef.current = false;
    queueMicrotask(() => returnFocusRef.current?.focus());
  }, [open, returnFocusRef]);

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = getFocusable(dialog);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.detailDrawer}
      aria-labelledby={titleId}
      data-testid="client-detail-drawer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <header className={styles.detailHead}>
        <h2 id={titleId} className={styles.detailTitle}>
          Карточка клиента
        </h2>
        <button
          ref={closeBtnRef}
          type="button"
          className={styles.detailIconClose}
          aria-label="Закрыть окно"
          data-testid="client-detail-close"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {client ? (
        <div className={styles.detailBody}>
          <div className={styles.detailTop}>
            <DetailAvatar client={client} />
            <div className={styles.detailIdentity}>
              <h3 data-testid="client-detail-name">{displayName(client)}</h3>
              <p data-testid="client-detail-meta">
                <span data-testid="client-detail-public-id">{client.publicId}</span>
                {" · "}
                <span data-testid="client-detail-city">{displayCity(client)}</span>
              </p>
            </div>
          </div>

          {client.isBlocked ? (
            <span className={`${styles.pill} ${styles.pillBlocked}`}>Заблокирован</span>
          ) : (
            <span className={`${styles.pill} ${styles.pillGap}`} data-testid="client-detail-stage-gap">
              Этап сделки недоступен
            </span>
          )}

          <section className={styles.detailSection} aria-labelledby={`${titleId}-source`}>
            <h3 id={`${titleId}-source`}>Откуда пришёл</h3>
            <p className={styles.detailGap} data-testid="client-detail-source-gap">
              Источник рекомендации пока не отображается.
            </p>
          </section>

          <section className={styles.detailSection} aria-labelledby={`${titleId}-analytics`}>
            <h3 id={`${titleId}-analytics`}>Аналитика</h3>
            <p className={styles.detailGap} data-testid="client-detail-consent-gap">
              Согласие на учёт визитов и активность по согласию пока недоступны.
            </p>
          </section>

          <section className={styles.detailSection} aria-labelledby={`${titleId}-history`}>
            <h3 id={`${titleId}-history`}>История клиента</h3>
            <div className={styles.auditRow}>
              <span className={styles.auditMuted}>Регистрация</span>
              <span data-testid="client-detail-registered">
                {formatClientRegisteredAt(client.createdAt)}
              </span>
            </div>
            <div className={styles.auditRow}>
              <span className={styles.auditMuted}>Текущий этап</span>
              <span data-testid="client-detail-history-stage-gap">Пока нет в данных клиентов</span>
            </div>
          </section>

          <p className={styles.detailHelp}>
            Карточка только для просмотра. Контакты, сделки, проекты и изменение аккаунта здесь
            недоступны.
          </p>
        </div>
      ) : null}

      <footer className={styles.detailFooter}>
        <button
          type="button"
          className={styles.detailCloseBtn}
          data-testid="client-detail-close-footer"
          onClick={onClose}
        >
          Закрыть
        </button>
      </footer>
    </dialog>
  );
}
