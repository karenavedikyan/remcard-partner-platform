"use client";

import { useId } from "react";
import { partnerAppealStats } from "@/lib/clients-parity/observer-stats";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import styles from "./observer.module.css";

function formatObserverDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  partner: ObserverPartnerMeta;
  appeals: ObserverReferredAppeal[];
  expanded: boolean;
  onToggle: (open: boolean) => void;
};

export function ObserverPartnerCard({ partner, appeals, expanded, onToggle }: Props) {
  const stats = partnerAppealStats(appeals);
  const last = formatObserverDate(stats.lastUpdate);
  const summaryId = useId();

  return (
    <article className={styles.partnerCard} data-testid="ca-observer-partner-card">
      <div className={styles.compactTop}>
        <div className={styles.partnerCardHead}>
          <strong>
            {partner.name} <span aria-hidden="true">→</span>
          </strong>
          <span className={styles.partnerCategory}>
            {[partner.category, partner.city].filter(Boolean).join(" · ") || " "}
          </span>
        </div>
        <dl className={styles.stats} aria-label="Показатели видимых клиентов">
          <div>
            <dt>Направлено</dt>
            <dd>{stats.total}</dd>
          </div>
          <div>
            <dt>В работе</dt>
            <dd>{stats.inWork}</dd>
          </div>
          <div>
            <dt>С оплатой</dt>
            <dd>{stats.paidThrough}</dd>
          </div>
          <div>
            <dt>Отказы</dt>
            <dd>{stats.refusals}</dd>
          </div>
        </dl>
      </div>
      <details
        className={styles.disclosure}
        open={expanded}
        onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
        data-observer-partner-details={partner.id}
      >
        <summary aria-controls={summaryId}>
          <span className={styles.meta}>
            <span>
              Конверсия в оплату <strong>{stats.conv}</strong>
            </span>
            <span>
              Возвраты <strong>{stats.returns}</strong>
            </span>
            <span>
              Обновлено <time dateTime={stats.lastUpdate}>{last}</time>
            </span>
          </span>
          <span className={styles.toggleLabel}>
            Клиенты <b>{appeals.length}</b>
            {expanded ? "Скрыть" : "Показать"}
          </span>
        </summary>
        <div id={summaryId} className={styles.intro}>
          Раскрытие клиентов станет доступно после подключения API направлений (BLK-OBSERVER-REFERRED).
        </div>
      </details>
    </article>
  );
}
