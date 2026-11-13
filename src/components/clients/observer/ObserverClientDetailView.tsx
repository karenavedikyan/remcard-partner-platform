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
};

export function ObserverClientDetailView({ appeal, partner, onBack }: Props) {
  return (
    <div className={styles.section} data-testid="ca-observer-client-page">
      <button type="button" className={styles.backBtn} data-ca-action="observer:back" onClick={onBack}>
        ← Назад
      </button>
      <h2>{displayClientName(appeal)}</h2>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Партнёр</dt>
          <dd>{partner?.name ?? appeal.receivingPartnerUserId ?? appeal.receivingPartnerId}</dd>
        </div>
        <div>
          <dt>Статус у партнёра</dt>
          <dd>{observerAppealStatusLabel(appeal)}</dd>
        </div>
        <div>
          <dt>Интерес</dt>
          <dd>{appeal.interest || appeal.certificateId || "—"}</dd>
        </div>
        <div>
          <dt>Обновлено</dt>
          <dd>
            <time dateTime={appeal.updatedAt}>{formatObserverDateTime(appeal.updatedAt)}</time>
          </dd>
        </div>
      </dl>
      <p className={styles.mutedSmall}>
        Внутренние заметки принимающего и данные покупки здесь не показываются (только публичный контур
        направления).
      </p>
    </div>
  );
}
