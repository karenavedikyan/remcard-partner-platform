"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { ReceivingAppealHistory } from "../receiving/ReceivingAppealHistory";
import styles from "./observer.module.css";

/** Where the client detail was opened from (prototype back labels). */
export type ObserverClientBackFrom = "partner-clients" | "partners-list" | "flat-list";

export function resolveObserverClientBackLabel(
  backFrom?: ObserverClientBackFrom,
  backLabel?: string,
): string {
  if (backLabel) return backLabel;
  if (backFrom === "partner-clients") return "← К списку клиентов";
  if (backFrom === "partners-list") return "← К партнёрам";
  if (backFrom === "flat-list") return "← Назад к списку";
  return "← Назад";
}

/** Input slice P3 can derive from `nav` + `layout` without importing nav types. */
export type ObserverClientBackFromInput = {
  /** Set when `openClientPage(id, nav.partnerId)` was used (partner drill). */
  navPartnerId?: string;
  layout?: "partners" | "list";
};

export function resolveObserverClientBackFrom(
  input: ObserverClientBackFromInput,
): ObserverClientBackFrom {
  if (input.navPartnerId) return "partner-clients";
  if (input.layout === "list") return "flat-list";
  return "partners-list";
}

/** Stable name used by P3 shell (`ObserverPartnersListView` @ 9c3221ad). */
export type ObserverClientNavSlice = { partnerId?: string };

export function observerClientBackFrom(
  clientNav: ObserverClientNavSlice,
  layout: "partners" | "list",
): ObserverClientBackFrom {
  return resolveObserverClientBackFrom({ navPartnerId: clientNav.partnerId, layout });
}

/** K2-safe public timeline lines — no privateNotes / clientContact in payload. */
export type ObserverPublicTimelineEntry = { at: string; text: string };

type Props = {
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  /** Overrides `backFrom` when the shell needs an explicit string. */
  backLabel?: string;
  /** When set by K2 GET detail; empty array still renders honest empty state. */
  publicTimeline?: ObserverPublicTimelineEntry[];
  refusedReason?: string | null;
};

export function ObserverClientDetailView({
  appeal,
  partner,
  onBack,
  backFrom,
  backLabel,
  publicTimeline,
  refusedReason,
}: Props) {
  const clientName = displayClientName(appeal);
  const interest = appeal.interest?.trim();
  const certificate = appeal.certificateId?.trim();
  const resolvedBackLabel = resolveObserverClientBackLabel(backFrom, backLabel);

  return (
    <div className={styles.section} data-testid="ca-observer-client-page">
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        {resolvedBackLabel}
      </button>
      <header className={styles.partnerPageHead}>
        {interest ? <p className={styles.mutedSmall}>{interest}</p> : null}
        <h2 id="ca-observer-client-title">{clientName}</h2>
      </header>
      <dl className={styles.detailGrid} aria-labelledby="ca-observer-client-title">
        <div>
          <dt>ID направления</dt>
          <dd>
            <code data-testid="ca-observer-appeal-id">{appeal.id}</code>
          </dd>
        </div>
        <div>
          <dt>Партнёр</dt>
          <dd>
            {partner?.name ?? (
              <span data-testid="ca-observer-partner-unavailable">
                Партнёр недоступен (id: {appeal.receivingPartnerId})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Статус у партнёра</dt>
          <dd>{observerAppealStatusLabel(appeal)}</dd>
        </div>
        <div>
          <dt>Интерес</dt>
          <dd>{interest || "—"}</dd>
        </div>
        <div>
          <dt>Сертификат</dt>
          <dd>{certificate || "—"}</dd>
        </div>
        <div>
          <dt>Направлено</dt>
          <dd>
            {appeal.referralAt ? (
              <time dateTime={appeal.referralAt}>{formatObserverDateTime(appeal.referralAt)}</time>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Обновлено</dt>
          <dd>
            <time dateTime={appeal.updatedAt}>{formatObserverDateTime(appeal.updatedAt)}</time>
          </dd>
        </div>
      </dl>
      {publicTimeline !== undefined ? (
        <ReceivingAppealHistory
          entries={publicTimeline.map((row) => ({ at: row.at, text: row.text }))}
          projection="referrer-public"
          refusedReason={refusedReason}
          emptyLabel="Публичных событий пока нет."
        />
      ) : (
        <section
          className={styles.mutedSmall}
          data-testid="ca-observer-client-timeline-na"
          aria-label="Хронология направления"
        >
          Публичная хронология и данные покупки недоступны без подтверждённого контракта направлений
          (BLK-OBSERVER-REFERRED).
        </section>
      )}
    </div>
  );
}

type ClientMissingProps = {
  clientId?: string;
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  backLabel?: string;
};

/** Synthetic 404 — shell renders when `nav.clientId` does not resolve (read P3). */
export function ObserverClientDetailMissing({
  clientId,
  onBack,
  backFrom,
  backLabel,
}: ClientMissingProps) {
  const resolvedBackLabel = resolveObserverClientBackLabel(backFrom, backLabel);
  return (
    <div
      className={styles.section}
      data-testid="ca-observer-client-page"
      data-ca-state="missing"
    >
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        {resolvedBackLabel}
      </button>
      <section className={styles.blocked} data-testid="ca-observer-client-missing">
        <h2>Направление не найдено</h2>
        <p className={styles.mutedSmall}>
          {clientId
            ? `Запись «${clientId}» отсутствует в доступном списке или скрыта фильтрами.`
            : "Запись отсутствует в доступном списке или скрыта фильтрами."}
        </p>
      </section>
    </div>
  );
}
