"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import styles from "./observer.module.css";

type Props = {
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  onBack: () => void;
  /** Prototype «К списку клиентов» vs «К партнёрам» — set by list shell when wired. */
  backLabel?: string;
};

export function ObserverClientDetailView({
  appeal,
  partner,
  onBack,
  backLabel = "← Назад",
}: Props) {
  const clientName = displayClientName(appeal);
  const interest = appeal.interest?.trim();
  const certificate = appeal.certificateId?.trim();

  return (
    <div className={styles.section} data-testid="ca-observer-client-page">
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        aria-label={backLabel.replace(/^←\s*/, "")}
        onClick={onBack}
      >
        {backLabel}
      </button>
      <header className={styles.partnerPageHead}>
        {interest ? <p className={styles.mutedSmall}>{interest}</p> : null}
        <h2 id="ca-observer-client-title">{clientName}</h2>
      </header>
      <dl className={styles.detailGrid} aria-labelledby="ca-observer-client-title">
        <div>
          <dt>Партнёр</dt>
          <dd>
            {partner?.name ?? (
              <span data-testid="ca-observer-partner-unavailable">
                Партнёр недоступен ({appeal.receivingPartnerId})
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
      <section
        className={styles.mutedSmall}
        data-testid="ca-observer-client-timeline-na"
        aria-label="Хронология направления"
      >
        Публичная хронология и данные покупки недоступны без подтверждённого контракта направлений
        (BLK-OBSERVER-REFERRED).
      </section>
    </div>
  );
}
